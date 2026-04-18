import { NextRequest } from "next/server";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { rateLimiter } from "@/services/rateLimiter";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { generation_id } = body;

        if (!generation_id) {
            throw new ApiError(400, "Missing generation_id");
        }

        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

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
