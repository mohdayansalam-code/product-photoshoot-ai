import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { ApiError } from "../lib/apiError";
import { getOrCreateCreditsRecord } from "../lib/creditsAuth.js";

export const creditSystem = {
    /**
     * Gets or creates user credits automatically.
     */
    getOrCreateCredits: async (supabaseAdmin: SupabaseClient, userId: string) => {
        console.log("Checking credits for:", userId);

        try {
            return await getOrCreateCreditsRecord(supabaseAdmin, userId);
        } catch (error) {
            logger.error("Failed to initialize credits row", { error, userId });
            throw new ApiError(500, "Failed to initialize credit balance.");
        }
    },

    /**
     * Checks if user has enough credits
     */
    hasCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number): Promise<boolean> => {
        const creditsData = await creditSystem.getOrCreateCredits(supabaseAdmin, userId);
        return creditsData.credits_remaining >= amount;
    },

    /**
     * Deducts credits atomically.
     */
    deductCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number, type: string = "generation", description: string = "Photoshoot generation"): Promise<boolean> => {
        const creditsData = await creditSystem.getOrCreateCredits(supabaseAdmin, userId);
        const currentRemaining = creditsData.credits_remaining;
        const currentUsed = creditsData.credits_used;

        if (currentRemaining < amount) {
            logger.warn(`Insufficient credits for [${type}]`, { userId, cost: amount, current: currentRemaining });
            throw new ApiError(402, `Insufficient credits. Requires ${amount}.`, "INSUFFICIENT_CREDITS");
        }

        const newRemaining = Math.max(0, currentRemaining - amount);
        const newUsed = currentUsed + amount;

        const { data: result, error: updateError } = await supabaseAdmin
            .from("credits")
            .update({ 
                credits_remaining: newRemaining,
                credits_used: newUsed
            })
            .eq("user_id", userId)
            .eq("credits_remaining", currentRemaining)
            .select();

        if (updateError || !result || result.length === 0) {
            logger.error(`Database error deducting credits`, { error: updateError?.message });
            throw new ApiError(409, "Simultaneous transaction detected. Please try again.", "TRANSACTION_COLLISION");
        }

        await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            amount: -amount,
            type,
            description
        });

        console.log(`Credit deducted: ${userId} ${amount}`);
        return true;
    },

    /**
     * Refunds credits automatically on failure.
     */
    refundCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number, type: string = "refund", description: string = "Generation failed refund"): Promise<boolean> => {
        const creditsData = await creditSystem.getOrCreateCredits(supabaseAdmin, userId);
        const currentRemaining = creditsData.credits_remaining;
        const currentUsed = creditsData.credits_used;

        const newRemaining = currentRemaining + amount;
        const newUsed = Math.max(0, currentUsed - amount);

        const { data: result, error: updateError } = await supabaseAdmin
            .from("credits")
            .update({ 
                credits_remaining: newRemaining,
                credits_used: newUsed
            })
            .eq("user_id", userId)
            .eq("credits_remaining", currentRemaining)
            .select();

        if (updateError || !result || result.length === 0) {
            logger.error(`Database error refunding credits for ${userId}`, { error: updateError?.message });
            return false;
        }

        await supabaseAdmin.from("credit_transactions").insert({
            user_id: userId,
            amount: amount,
            type,
            description
        });

        console.log(`Credit refunded: ${userId} ${amount}`);
        return true;
    }
};
