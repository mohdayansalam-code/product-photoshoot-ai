import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { generation_id, image_url } = body;

        if (!generation_id || !image_url) {
            return NextResponse.json(
                { success: false, error: "Missing generation_id or image_url" },
                { status: 400 }
            );
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = user.id;

        // Rate Limiting Logic (10 calls/min)
        const { data: rlData } = await supabaseAdmin
            .from("generation_rate_limit")
            .select("*")
            .eq("user_id", userId)
            .single();

        const now = new Date();

        if (!rlData) {
            await supabaseAdmin.from("generation_rate_limit").insert({
                user_id: userId,
                request_count: 1,
                window_start: now.toISOString()
            });
        } else {
            const timeDiff = now.getTime() - new Date(rlData.window_start).getTime();

            if (timeDiff < 60000) {
                if (rlData.request_count >= 10) {
                    logger.warn("Variations Rate limit exceeded", { userId });
                    return NextResponse.json(
                        { success: false, error: "Rate limit exceeded. Please wait." },
                        { status: 429 }
                    );
                } else {
                    await supabaseAdmin.from("generation_rate_limit").update({ request_count: rlData.request_count + 1 }).eq("user_id", userId);
                }
            } else {
                await supabaseAdmin.from("generation_rate_limit").update({
                    request_count: 1,
                    window_start: now.toISOString()
                }).eq("user_id", userId);
            }
        }

        // Fetch original generation to replicate prompt
        const { data: originalGen, error: fetchError } = await supabaseAdmin
            .from("generations")
            .select("prompt")
            .eq("id", generation_id)
            .eq("user_id", userId)
            .single();

        if (fetchError || !originalGen) {
            return NextResponse.json({ success: false, error: "Original generation not found." }, { status: 404 });
        }

        const model = "gemini-3.1";
        const image_count = 4;

        // Gemini costs 20cr for 4 images
        const credits_cost = 20;

        // Check user credits
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .single();

        if (!creditsData || creditsData.credits_remaining < credits_cost) {
            logger.warn("Not enough credits for variations", { userId, cost: credits_cost });
            return NextResponse.json(
                { success: false, error: `Insufficient credits. Variations require ${credits_cost} credits.` },
                { status: 402 }
            );
        }

        // Deduct credits PRE-GENERATION
        await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: creditsData.credits_remaining - credits_cost })
            .eq("user_id", userId);

        logger.info(`Deducted ${credits_cost} credits for variations`, { userId });

        // Insert pending job into generations table
        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generations")
            .insert({
                user_id: userId,
                image_url: image_url, // Feed image_url as input
                prompt: originalGen.prompt, // Reuse original prompt
                model: model, // Lock model to gemini-3.1
                image_count: image_count,
                status: "queued"
            })
            .select("id")
            .single();

        if (jobError || !jobData) {
            logger.error("Failed to enqueue variations job", { error: jobError });
            // Rollback credits on catastrophic insertion failure
            await supabaseAdmin
                .from("credits")
                .update({ credits_remaining: creditsData.credits_remaining })
                .eq("user_id", userId);

            return NextResponse.json(
                { success: false, error: "Failed to enqueue variations job" },
                { status: 500 }
            );
        }

        logger.generation("started", userId, jobData.id, "queued", { type: "variations", credits_deducted: credits_cost });

        return NextResponse.json({
            success: true,
            generation_id: jobData.id,
            status: "queued"
        });

    } catch (error: any) {
        logger.error("Generate variations route crash", { error: error.message });
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate variations" },
            { status: 500 }
        );
    }
}
