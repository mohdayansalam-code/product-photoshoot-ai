import { NextRequest } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createAdminClient(config.supabase.url, config.supabase.serviceRoleKey);

        const { data: creditsData, error: dbError } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();

        if (dbError || !creditsData) {
            throw new ApiError(404, "Could not fetch credits record.", "CREDITS_NOT_FOUND");
        }

        return standardResponse.success({
            credits_remaining: creditsData.credits_remaining
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
