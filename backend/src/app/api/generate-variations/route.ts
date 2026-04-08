import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";
import { creditSystem } from "@/services/creditSystem";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "No token provided", "UNAUTHORIZED");

        const supabaseAuth = createClient(config.supabase.url, config.supabase.anonKey);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const body = await req.json();
        const { generation_id, image_url } = body;

        if (!generation_id || !image_url) {
            throw new ApiError(400, "Missing generation_id or image_url");
        }

        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

        await rateLimiter.checkLimit(supabaseAdmin, user.id, 10, 60000, "variations_generation");

        const { data: originalGen, error: fetchError } = await supabaseAdmin
            .from("generations")
            .select("prompt")
            .eq("id", generation_id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !originalGen) {
            throw new ApiError(404, "Original generation not found", "NOT_FOUND");
        }

        const model = config.models.defaultVariation;
        const image_count = 4;
        const credits_cost = 20;
        const request_id = body.request_id || req.headers.get("x-request-id");

        const { data: result, error: rpcError } = await supabaseAdmin.rpc("create_generation_job", {
            p_user_id: user.id,
            p_request_id: request_id,
            p_image_url: image_url,
            p_prompt: originalGen.prompt,
            p_model: model,
            p_image_count: image_count,
            p_fetchers_json: {},
            p_credits_cost: credits_cost
        });

        if (rpcError) {
            logger.error("Variations RPC Failed", { error: rpcError });
            throw new ApiError(500, "Failed to start variations job safely.");
        }

        if (!result.success) {
            throw new ApiError(500, `Variations Error: ${result.error}`);
        }

        logger.generation("started", user.id, result.id, "queued", { type: "variations", credits_deducted: credits_cost, idempotent: result.idempotent });

        return standardResponse.success({
            generation_id: result.id,
            status: "queued"
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
