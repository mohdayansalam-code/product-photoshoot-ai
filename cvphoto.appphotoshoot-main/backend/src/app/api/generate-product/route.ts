import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Handle extended payload fields
        const product_image = body.product_image || body.imageUrl; // fallback for backwards compat
        const scene_prompt = body.scene_prompt || body.prompt || body.template;

        const model = body.recommended_model || body.model || process.env.DEFAULT_AI_MODEL || "seedream-4.5";
        const product_lock = body.product_lock !== undefined ? body.product_lock : (body.lock_style !== undefined ? body.lock_style : true);
        const resolution = body.recommended_resolution || process.env.DEFAULT_IMAGE_RESOLUTION || "2k";
        const fetchers = body.fetchers || {};
        const seed = body.seed !== undefined ? Number(body.seed) : Math.floor(Math.random() * 1000000000);
        const image_count = Math.min(Math.max(body.image_count ?? 4, 1), 4);

        if (!product_image || !scene_prompt) {
            return NextResponse.json(
                { success: false, error: "Missing product_image or scene_prompt" },
                { status: 400 }
            );
        }

        // Calculate credits based on proportional model cost
        let base_model_credits = 10;
        if (model === "flux-2-pro") base_model_credits = 8;
        else if (model === "seedream-4.5") base_model_credits = 10;
        else if (model === "gemini-3.1") base_model_credits = 20;

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
            return NextResponse.json(
                { success: false, error: `Insufficient credits. Generation Requires ${credits_cost} credits.` },
                { status: 402 }
            );
        }

        const templatePayload = JSON.stringify({
            scene_prompt,
            model,
            resolution,
            product_lock,
            fetchers,
            credits_cost,
            seed,
            image_count
        });

        // Insert pending job into generations table
        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generations")
            .insert({
                user_id: userId,
                image_url: product_image,
                prompt: scene_prompt,
                model: model,
                image_count: image_count,
                fetchers_json: fetchers,
                status: "queued"
            })
            .select("id")
            .single();

        if (jobError || !jobData) {
            console.error("Failed to enqueue generation job:", jobError);
            return NextResponse.json(
                { success: false, error: "Failed to enqueue generation job" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            generation_id: jobData.id,
            status: "queued"
        });

    } catch (error: any) {
        console.error("Generate product error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to generate product images" },
            { status: 500 }
        );
    }
}
