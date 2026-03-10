import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        const { data: creditsData, error } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();

        if (error || !creditsData) {
            console.error("Error fetching credits:", error);
            return NextResponse.json(
                { success: false, error: "Could not fetch credits" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            credits_remaining: creditsData.credits_remaining
        });

    } catch (error: any) {
        console.error("Credits API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
