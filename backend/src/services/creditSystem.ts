import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { ApiError } from "../lib/apiError";

export const creditSystem = {
    ensureCreditsRow: async (supabaseAdmin: SupabaseClient, userId: string) => {
        let { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .single();

        if (!creditsData) {
            const { data: newRow, error } = await supabaseAdmin
                .from("credits")
                .insert({ user_id: userId, credits_remaining: 10 })
                .select("credits_remaining")
                .single();
            
            if (error) {
                logger.error("Failed to initialize credits row", { error, userId });
                throw new ApiError(500, "Failed to initialize credit balance.");
            }
            
            // Give 10 welcome credits
            await supabaseAdmin.from("credit_transactions").insert({
                user_id: userId,
                amount: 10,
                type: "purchase",
                description: "Welcome Bonus"
            });
            
            return newRow;
        }
        return creditsData;
    },

    /**
     * Checks if user has enough credits
     */
    hasCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number): Promise<boolean> => {
        const creditsData = await creditSystem.ensureCreditsRow(supabaseAdmin, userId);
        return creditsData.credits_remaining >= amount;
    },

    /**
     * Deducts credits atomically using OCC.
     */
    deductCredits: async (supabaseAdmin: SupabaseClient, userId: string, amount: number, type: string = "generation", description: string = "Photoshoot generation"): Promise<boolean> => {
        const creditsData = await creditSystem.ensureCreditsRow(supabaseAdmin, userId);
        const currentCredits = creditsData.credits_remaining;

        if (currentCredits < amount) {
            logger.warn(`Insufficient credits for [${type}]`, { userId, cost: amount, current: currentCredits });
            throw new ApiError(402, `Insufficient credits. Requires ${amount}.`, "INSUFFICIENT_CREDITS");
        }

        const { data: result, error: updateError } = await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: currentCredits - amount })
            .eq("user_id", userId)
            .eq("credits_remaining", currentCredits)
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
        const creditsData = await creditSystem.ensureCreditsRow(supabaseAdmin, userId);
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
