import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const product_image = body.product_image || body.imageUrl;
        let finalPrompt = body.prompt || body.scene_prompt || body.template || "";

        // 1. Scene Helper Shortcuts
        const scene = body.scene;
        if (scene === "luxury-skincare-studio") {
            finalPrompt += ", luxury skincare studio, marble surface, soft beauty lighting, premium product photography";
        } else if (scene === "amazon-white-background") {
            finalPrompt += ", pure white seamless background, clean professional ecommerce product photography";
        } else if (scene === "jewelry-macro-shot") {
            finalPrompt += ", macro jewelry photography on dark velvet, dramatic spotlight, luxury close-up";
        }

        // 2. Smart Model Routing
        let model = body.recommended_model || body.model;
        if (!model) {
            const p = finalPrompt.toLowerCase();
            if (p.includes("different angles") || p.includes("model poses") || p.includes("street photoshoot") || p.includes("fashion shoot") || p.includes("variations")) {
                model = "gemini-3.1";
            } else if (p.includes("consistent") || p.includes("same product") || p.includes("same scene") || p.includes("product photoshoot")) {
                model = "seedream-4.5";
            } else if (p.includes("product photography") || p.includes("studio photo") || p.includes("ecommerce product")) {
                model = "seedream-5-lite";
            } else {
                model = "flux-2-pro";
            }
        }

        const fetchers = body.fetchers || {};
        const image_count = Math.min(Math.max(body.image_count ?? 4, 1), 4);

        if (!product_image || !finalPrompt || finalPrompt.trim() === "") {
            return NextResponse.json(
                { success: false, error: "Missing product_image or prompt" },
                { status: 400 }
            );
        }

        // Calculate credits based on proportional model cost
        let base_model_credits = 10;
        const MODEL_CREDITS: Record<string, number> = {
            "flux-2-pro": 8,
            "seedream-5-lite": 12,
            "seedream-4.5": 10,
            "gemini-3.1": 20
        };
        if (MODEL_CREDITS[model]) {
            base_model_credits = MODEL_CREDITS[model];
        }

        let generation_credits = (base_model_credits / 4) * image_count;

        let fetcher_credits = 0;
        if (fetchers.remove_background) fetcher_credits += 1;
        if (fetchers.white_background) fetcher_credits += 1;
        if (fetchers.super_resolution) fetcher_credits += 2;
        if (fetchers.upscale_v4) fetcher_credits += 4;
        if (fetchers.product_fix) fetcher_credits += 2;
        if (fetchers.face_correction) fetcher_credits += 2;

        let credits_cost = generation_credits + fetcher_credits;

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const userId = user.id;

        // Rate Limiting Logic
        const { data: rlData } = await supabaseAdmin
            .from("generation_rate_limit")
            .select("*")
            .eq("user_id", userId)
            .single();

        const now = new Date();

        if (!rlData) {
            // No record exists, create one
            await supabaseAdmin
                .from("generation_rate_limit")
                .insert({
                    user_id: userId,
                    request_count: 1,
                    window_start: now.toISOString()
                });
        } else {
            const windowStart = new Date(rlData.window_start);
            const timeDiff = now.getTime() - windowStart.getTime();

            if (timeDiff < 60000) { // less than 1 minute
                if (rlData.request_count >= 10) {
                    logger.warn("Rate limit exceeded", { userId });
                    return NextResponse.json(
                        { success: false, error: "Rate limit exceeded. Please wait." },
                        { status: 429 }
                    );
                } else {
                    await supabaseAdmin
                        .from("generation_rate_limit")
                        .update({ request_count: rlData.request_count + 1 })
                        .eq("user_id", userId);
                }
            } else {
                // Window expired, reset
                await supabaseAdmin
                    .from("generation_rate_limit")
                    .update({
                        request_count: 1,
                        window_start: now.toISOString()
                    })
                    .eq("user_id", userId);
            }
        }

        // Check user credits
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", userId)
            .single();

        if (!creditsData || creditsData.credits_remaining < credits_cost) {
            logger.warn("Not enough credits", { userId, cost: credits_cost });
            return NextResponse.json(
                { success: false, error: `Insufficient credits. Generation Requires ${credits_cost} credits.` },
                { status: 402 }
            );
        }

        // Deduct credits PRE-GENERATION intentionally
        await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: creditsData.credits_remaining - credits_cost })
            .eq("user_id", userId);

        logger.info(`Deducted ${credits_cost} credits for job initiation`, { userId });

        logger.info(`Deducted ${credits_cost} credits for job initiation`, { userId });

        // Insert pending job into generations table
        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generations")
            .insert({
                user_id: userId,
                image_url: product_image,
                prompt: finalPrompt,
                model: model,
                image_count: image_count,
                fetchers_json: fetchers,
                credits_used: credits_cost,
                status: "queued"
            })
            .select("id")
            .single();

        if (jobError || !jobData) {
            logger.error("Failed to enqueue generation job", { error: jobError });
            // Rollback credits on catastrophic insertion failure
            await supabaseAdmin
                .from("credits")
                .update({ credits_remaining: creditsData.credits_remaining })
                .eq("user_id", userId);

            return NextResponse.json(
                { success: false, error: "Failed to enqueue generation job" },
                { status: 500 }
            );
        }

        logger.generation("started", userId, jobData.id, "queued", { credits_deducted: credits_cost });

        return NextResponse.json({
            success: true,
            generation_id: jobData.id,
            status: "queued"
        });

    } catch (error: any) {
        logger.error("Generate product route crash", { error: error.message });
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate product images" },
            { status: 500 }
        );
    }
}
