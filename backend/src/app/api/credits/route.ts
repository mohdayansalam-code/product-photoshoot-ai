import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "No token provided", "UNAUTHORIZED");

        const supabaseAuth = createClient(config.supabase.url, config.supabase.anonKey);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

        let { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();

        if (!creditsData) {
            await supabaseAdmin.from("credits").insert({
                user_id: user.id,
                credits_remaining: 10
            });
            await supabaseAdmin.from("credit_transactions").insert({
                user_id: user.id,
                amount: 10,
                type: "purchase",
                description: "Welcome Bonus"
            });
            creditsData = { credits_remaining: 10 };
        }

        const { data: transactions } = await supabaseAdmin
            .from("credit_transactions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10);

        return standardResponse.success({
            credits_remaining: creditsData.credits_remaining,
            transactions: transactions || []
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
