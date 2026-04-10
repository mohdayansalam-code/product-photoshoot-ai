import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        // ✅ 1. AUTH HEADER CHECK
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const token = authHeader.split(" ")[1];

        // ✅ 2. ADMIN CLIENT
        const supabaseAdmin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // ✅ 3. VERIFY USER
        const { data: userData, error: userError } =
            await supabaseAdmin.auth.getUser(token);

        if (userError || !userData?.user) {
            return NextResponse.json(
                { success: false, error: "Invalid user" },
                { status: 401 }
            );
        }

        const userId = userData.user.id;

        // ✅ 4. FETCH CREDITS
        const { data: credits, error: creditsError } = await supabaseAdmin
            .from("credits")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (creditsError) {
            console.error("FETCH ERROR:", creditsError);
            throw new Error(creditsError.message);
        }

        // ✅ 5. NEW USER → INSERT
        if (!credits) {
            const { data, error } = await supabaseAdmin
                .from("credits")
                .insert({
                    user_id: userId,
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10,
                })
                .select()
                .single();

            if (error) {
                console.error("INSERT ERROR:", error);
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                data: {
                    credits_remaining: data.credits_remaining,
                    credits_used: data.credits_used,
                    credits_purchased: data.credits_purchased,
                },
            });
        }

        // ✅ 6. FIX BROKEN USER
        if (credits.credits_purchased === 0) {
            const { data, error } = await supabaseAdmin
                .from("credits")
                .update({
                    credits_remaining: 10,
                    credits_used: 0,
                    credits_purchased: 10,
                })
                .eq("user_id", userId)
                .select()
                .single();

            if (error) {
                console.error("UPDATE ERROR:", error);
                throw new Error(error.message);
            }

            return NextResponse.json({
                success: true,
                data: {
                    credits_remaining: data.credits_remaining,
                    credits_used: data.credits_used,
                    credits_purchased: data.credits_purchased,
                },
            });
        }

        // ✅ 7. NORMAL USER
        return NextResponse.json({
            success: true,
            data: {
                credits_remaining: credits.credits_remaining,
                credits_used: credits.credits_used,
                credits_purchased: credits.credits_purchased,
            },
        });
    } catch (error: any) {
        console.error("API ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "Internal Server Error",
            },
            { status: 500 }
        );
    }
}