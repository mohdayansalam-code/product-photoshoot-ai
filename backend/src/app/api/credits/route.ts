import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({
                success: false,
                error: "Unauthorized"
            }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const token = authHeader.split(" ")[1];

        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData?.user) {
            return new Response(JSON.stringify({
                success: false,
                error: "Invalid user"
            }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const userId = userData.user.id;

        const { data: creditsData, error: creditsError } = await supabaseAdmin
            .from("credits")
            .upsert({
                user_id: userId,
                credits_remaining: 10,
                credits_used: 0,
                credits_purchased: 10
            }, { onConflict: "user_id" })
            .select()
            .single();

        if (creditsError || !creditsData) {
            return new Response(JSON.stringify({
                success: false,
                error: creditsError?.message || "Failed to upsert credits"
            }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        console.log("User ID:", userId);
        console.log("Credits:", creditsData);

        return new Response(JSON.stringify({
            success: true,
            data: creditsData
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "Internal Server Error"
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
