import { NextRequest } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";
import { creditSystem } from "@/services/creditSystem";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const product_image = body.product_image || body.imageUrl;
        let finalPrompt = body.prompt || body.scene_prompt || body.template || "";

        const scene = body.scene;
        if (scene === "luxury-skincare-studio") {
            finalPrompt += ", luxury skincare studio, marble surface, soft beauty lighting, premium product photography";
        } else if (scene === "amazon-white-background") {
            finalPrompt += ", pure white seamless background, clean professional ecommerce product photography";
        } else if (scene === "jewelry-macro-shot") {
            finalPrompt += ", macro jewelry photography on dark velvet, dramatic spotlight, luxury close-up";
        }

        let model = body.recommended_model || body.model;
        if (!model || !config.models.allowed.includes(model)) {
            const p = finalPrompt.toLowerCase();
            if (p.includes("different angles") || p.includes("model poses") || p.includes("street photoshoot") || p.includes("fashion shoot") || p.includes("variations")) {
                model = "gemini-3.1";
            } else if (p.includes("consistent") || p.includes("same product") || p.includes("same scene") || p.includes("product photoshoot")) {
                model = "seedream-4.5";
            } else if (p.includes("product photography") || p.includes("studio photo") || p.includes("ecommerce product")) {
                model = "seedream-5-lite";
            } else {
                model = config.models.defaultGeneration;
            }
        }

        const fetchers = body.fetchers || {};
        const image_count = Math.min(Math.max(body.image_count ?? 4, 1), 4);

        if (!product_image || !finalPrompt || finalPrompt.trim() === "") {
            throw new ApiError(400, "Missing product_image or prompt");
        }

        let base_model_credits = 10;
        const MODEL_CREDITS: Record<string, number> = {
            "flux-2-pro": 8,
            "seedream-5-lite": 12,
            "seedream-4.5": 10,
            "gemini-3.1": 20
        };
        if (MODEL_CREDITS[model]) {
            base_model_credits = MODEL_CREDITS[model];
        }

        let generation_credits = (base_model_credits / 4) * image_count;
        let fetcher_credits = 0;
        
        if (fetchers.remove_background) fetcher_credits += 1;
        if (fetchers.white_background) fetcher_credits += 1;
        if (fetchers.super_resolution) fetcher_credits += 2;
        if (fetchers.upscale_v4) fetcher_credits += 4;
        if (fetchers.product_fix) fetcher_credits += 2;
        if (fetchers.face_correction) fetcher_credits += 2;

        const credits_cost = generation_credits + fetcher_credits;

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createAdminClient(config.supabase.url, config.supabase.serviceRoleKey);
        
        await rateLimiter.checkLimit(supabaseAdmin, user.id, 10, 60000, "generation");

        // Idempotency: request_id check is integrated into the RPC below for ultimate atomicity.
        const request_id = body.request_id || req.headers.get("x-request-id");

        const { data: result, error: rpcError } = await supabaseAdmin.rpc("create_generation_job", {
            p_user_id: user.id,
            p_request_id: request_id,
            p_image_url: product_image,
            p_prompt: finalPrompt,
            p_model: model,
            p_image_count: image_count,
            p_fetchers_json: fetchers,
            p_credits_cost: credits_cost
        });

        if (rpcError) {
            logger.error("RPC Atomic Job Creation Failed", { error: rpcError });
            throw new ApiError(500, "Failed to initialize generation safely.");
        }

        if (!result.success) {
            if (result.error === "INSUFFICIENT_CREDITS") {
                throw new ApiError(402, "Insufficient credits for this model and quantity.", "INSUFFICIENT_CREDITS");
            }
            throw new ApiError(500, `DB Error: ${result.error}`);
        }

        if (result.idempotent) {
            logger.info(`Idempotent hit via RPC for ${request_id}`);
        }

        logger.generation("started", user.id, result.id, "queued", { credits_deducted: credits_cost, idempotent: result.idempotent });

        return standardResponse.success({
            generation_id: result.id,
            status: "queued"
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
