import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { generation_id } = body;

        if (!generation_id) {
            throw new ApiError(400, "Missing generation_id");
        }

        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "No token provided", "UNAUTHORIZED");

        const supabaseAuth = createClient(config.supabase.url, config.supabase.serviceRoleKey);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

        await rateLimiter.checkLimit(supabaseAdmin, user.id, 5, 60000, "retry-generation");

        const { data: jobData, error: fetchError } = await supabaseAdmin
            .from("generations")
            .select("status, user_id")
            .eq("id", generation_id)
            .single();

        if (fetchError || !jobData) {
            throw new ApiError(404, "Generation job not found", "NOT_FOUND");
        }
        
        if (jobData.user_id !== user.id) {
            throw new ApiError(403, "Access denied", "FORBIDDEN");
        }

        if (jobData.status !== "failed") {
            throw new ApiError(400, "Only failed jobs can be manually retried");
        }

        const { error: updateError } = await supabaseAdmin
            .from("generations")
            .update({
                status: "queued",
                error_reason: null, // Clear previous error
            })
            .eq("id", generation_id);

        if (updateError) {
            logger.error("Failed to re-queue generation", { error: updateError });
            throw new ApiError(500, "Failed to resume job");
        }

        logger.info(`Manually retried job: ${generation_id}`, { userId: user.id });

        return standardResponse.success({
            generation_id: generation_id,
            status: "queued"
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
