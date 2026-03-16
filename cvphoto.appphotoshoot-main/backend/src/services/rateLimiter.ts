import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { ApiError } from "../lib/apiError";

export const rateLimiter = {
    /**
     * Checks rate limits and throws ApiError(429) if exceeded.
     * Automates DB window tracking.
     */
    checkLimit: async (
        supabaseAdmin: SupabaseClient, 
        userId: string, 
        limit: number = 10, 
        windowMs: number = 60000, 
        context: string = "generation"
    ) => {
        const now = new Date();
        const { data: rlData } = await supabaseAdmin
            .from("generation_rate_limit") // Using existing table
            .select("*")
            .eq("user_id", userId)
            .single();

        if (!rlData) {
            await supabaseAdmin.from("generation_rate_limit").insert({
                user_id: userId,
                request_count: 1,
                window_start: now.toISOString()
            });
            return;
        }

        const windowStart = new Date(rlData.window_start);
        const timeDiff = now.getTime() - windowStart.getTime();

        if (timeDiff < windowMs) {
            if (rlData.request_count >= limit) {
                logger.warn(`Rate limit exceeded for [${context}]`, { userId });
                throw new ApiError(429, "Rate limit exceeded. Please wait a minute before trying again.", "RATE_LIMIT_EXCEEDED");
            } else {
                await supabaseAdmin
                    .from("generation_rate_limit")
                    .update({ request_count: rlData.request_count + 1 })
                    .eq("user_id", userId);
            }
        } else {
            // Window expired, reset fully
            await supabaseAdmin
                .from("generation_rate_limit")
                .update({
                    request_count: 1,
                    window_start: now.toISOString()
                })
                .eq("user_id", userId);
        }
    }
};
