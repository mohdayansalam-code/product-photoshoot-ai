import { NextRequest, NextResponse } from "next/server";
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

        let { data: credits, error: creditsError } = await supabaseAdmin
            .from("credits")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (creditsError) {
             throw new Error(creditsError.message);
        }

        // Create new user credits
        if (!credits) {
            const { data } = await supabaseAdmin
                .from("credits")
                .insert({
                    user_id: userId,
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10
                })
                .select()
                .single();

            return NextResponse.json({ success: true, data });
        }

        // Fix broken users
        if (credits.credits_purchased === 0) {
            const { data } = await supabaseAdmin
                .from("credits")
                .update({
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10
                })
                .eq("user_id", userId)
                .select()
                .single();

            return NextResponse.json({ success: true, data });
        }

        // Normal case
        return NextResponse.json({ success: true, data: credits });

    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "Internal Server Error"
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
