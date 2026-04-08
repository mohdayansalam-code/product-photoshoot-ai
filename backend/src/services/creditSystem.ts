import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { ApiError } from "../lib/apiError";

export const creditSystem = {
    /**
     * Deducts credits atomically using OCC.
     * Throws 402 if insufficient.
     * Throws 409 if race condition detected.
     */
    deductCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number, context: string = "generation"): Promise<boolean> => {
        // 1. Fetch current credits
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .single();

        if (!creditsData) {
            logger.warn("Credits row missing entirely", { userId });
            throw new ApiError(402, `Insufficient credits. Action requires ${amount}.`, "INSUFFICIENT_CREDITS");
        }

        const currentCredits = creditsData.credits_remaining;

        if (currentCredits < amount) {
            logger.warn(`Insufficient credits for [${context}]`, { userId, cost: amount, current: currentCredits });
            throw new ApiError(402, `Insufficient credits. Upgrade your plan. Requires ${amount}.`, "INSUFFICIENT_CREDITS");
        }

        // 2. Atomic OCC update (Optimistic Concurrency Control)
        // We only update if the 'credits_remaining' is EXACTLY what we just read.
        // This prevents double-spend race conditions from parallel API calls.
        const { data: result, error: updateError } = await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: currentCredits - amount })
            .eq("user_id", userId)
            .eq("credits_remaining", currentCredits) // OCC constraint
            .select();

        if (updateError) {
            logger.error(`Database error deducting credits`, { error: updateError.message });
            throw new ApiError(500, "Failed to process credit transaction safely.");
        }

        if (!result || result.length === 0) {
            // The row was changed out from under us by another request.
            logger.error(`Race condition blocked double-spend deduction for user`, { userId, context });
            throw new ApiError(409, "Simultaneous transaction detected. Please try again.", "TRANSACTION_COLLISION");
        }

         logger.info(`Deducted ${amount} credits securely for ${context}`, { userId });
         return true;
    },

    /**
     * Refunds credits automatically on failure.
     */
    refundCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number, context: string = "generation failure"): Promise<boolean> => {
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .single();

        if (!creditsData) return false;

        const currentCredits = creditsData.credits_remaining;

        const { data: result, error: updateError } = await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: currentCredits + amount })
            .eq("user_id", userId)
            .eq("credits_remaining", currentCredits)
            .select();

        if (updateError || !result || result.length === 0) {
            logger.error(`Database error refunding credits for ${userId}`, { error: updateError?.message });
            return false;
        }

        logger.info(`Refunded ${amount} credits securely for ${context}`, { userId });
        return true;
    }
};
