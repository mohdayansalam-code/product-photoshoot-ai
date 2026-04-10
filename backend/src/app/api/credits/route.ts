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

        // 2. If no user → INSERT
        if (!creditsData) {
            const { data: newCredits, error } = await supabaseAdmin
                .from("credits")
                .insert({
                    user_id: userId,
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10
                })
                .select()
                .single();

            console.log("INSERT RESULT:", newCredits);
            console.log("INSERT ERROR:", error);

            if (error) {
                console.error("INSERT ERROR:", error);
                throw new Error("Insert failed");
            }

            creditsData = newCredits;
        }

        // 3. If user exists but 0 → FIX
        if (creditsData.credits_purchased === 0) {
            const { data: updatedCredits, error } = await supabaseAdmin
                .from("credits")
                .update({
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10
                })
                .eq("user_id", userId)
                .select()
                .single();

            if (error) {
                console.error("UPDATE ERROR:", error);
                throw new Error("Update failed");
            }

            creditsData = updatedCredits;
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
