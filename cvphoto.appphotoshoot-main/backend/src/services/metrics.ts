import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

export interface GenerationMetrics {
    job_id: string;
    user_id: string;
    model: string;
    duration_ms: number;
    success: boolean;
    error_reason?: string;
    credits_used: number;
    image_count: number;
}

export const metrics = {
    logGeneration: async (supabaseAdmin: SupabaseClient, data: GenerationMetrics) => {
        try {
            const { error } = await supabaseAdmin
                .from("generation_metrics")
                .insert({
                    job_id: data.job_id,
                    user_id: data.user_id,
                    model: data.model,
                    duration_ms: data.duration_ms,
                    success: data.success,
                    error_reason: data.error_reason,
                    credits_used: data.credits_used,
                    image_count: data.image_count,
                    created_at: new Date().toISOString()
                });

            if (error) {
                // If table doesn't exist, we fall back to logger to avoid crashing process
                logger.error("Failed to persist metrics to DB", { error: error.message, data });
            }
        } catch (e: any) {
            logger.error("Metrics collection error", { error: e.message });
        }
    }
};
