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
                credits_remaining: 100
            });
            creditsData = { credits_remaining: 100 };
        }

        return standardResponse.success({
            credits_remaining: creditsData.credits_remaining
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
