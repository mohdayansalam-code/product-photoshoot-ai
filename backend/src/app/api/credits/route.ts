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

        let { data: creditsData, error: creditsError } = await supabaseAdmin
            .from("credits")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (creditsError) {
            return new Response(JSON.stringify({
                success: false,
                error: creditsError?.message || "Failed to fetch credits"
            }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        if (!creditsData || creditsData.credits_purchased === 0) {
            console.log("Fixing zero credits user or creating new user:", userId);

            const { data: updatedData, error: updateError } = await supabaseAdmin
                .from("credits")
                .upsert({
                    user_id: userId,
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10
                }, { onConflict: "user_id" })
                .select()
                .single();
                
            if (updateError) {
                return new Response(JSON.stringify({
                    success: false,
                    error: updateError?.message || "Failed to fix credits"
                }), { status: 500, headers: { "Content-Type": "application/json" } });
            }
            
            creditsData = updatedData;
        }

        console.log("FINAL CREDITS SENT:", creditsData);

        return NextResponse.json({
            success: true,
            data: {
                credits_remaining: creditsData.credits_remaining,
                credits_used: creditsData.credits_used,
                credits_purchased: creditsData.credits_purchased
            }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message || "Internal Server Error"
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
