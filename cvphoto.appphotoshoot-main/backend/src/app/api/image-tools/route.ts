import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageUrl, tool } = body;

        if (!imageUrl || !tool) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;
        const credits_cost = tool === 'upscale_v4' ? 4 : (tool === 'super_resolution' || tool === 'product_fix' || tool === 'face_correction' ? 2 : 1);

        // Rate Limiting Logic
        const now = new Date();
        const { data: rlData } = await supabaseAdmin
            .from("generation_rate_limit")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!rlData) {
            await supabaseAdmin.from("generation_rate_limit").insert({ user_id: user.id, request_count: 1, window_start: now.toISOString() });
        } else {
            const timeDiff = now.getTime() - new Date(rlData.window_start).getTime();
            if (timeDiff < 60000) {
                if (rlData.request_count >= 10) {
                    logger.warn("Image Tool rate limit exceeded", { userId: user.id });
                    return NextResponse.json({ error: "Rate limit exceeded. Please wait." }, { status: 429 });
                } else await supabaseAdmin.from("generation_rate_limit").update({ request_count: rlData.request_count + 1 }).eq("user_id", user.id);
            } else {
                await supabaseAdmin.from("generation_rate_limit").update({ request_count: 1, window_start: now.toISOString() }).eq("user_id", user.id);
            }
        }

        // 1. Verify credits
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();

        if (!creditsData || creditsData.credits_remaining < credits_cost) {
            logger.warn("Not enough credits for Image Tool", { userId: user.id, cost: credits_cost });
            return NextResponse.json({ error: `Insufficient credits. Requires ${credits_cost}.` }, { status: 402 });
        }

        if (!ASTRIA_API_KEY || ASTRIA_API_KEY === "") {
            // Mock response if no API key
            await new Promise(r => setTimeout(r, 1500));
            // Deduct credits
            await supabaseAdmin
                .from("credits")
                .update({ credits_remaining: creditsData.credits_remaining - credits_cost })
                .eq("user_id", user.id);

            return NextResponse.json({
                success: true,
                image_url: imageUrl, // returning same image as mock
            });
        }

        // 2. Fetcher Mapping
        const astriaEndpoint = `https://api.astria.ai/tunes/690204/prompts`;

        let promptText = "A product photo";
        if (tool === 'remove_bg') promptText += ", transparent background, remove background";
        if (tool === 'white_bg') promptText += ", pure white ecommerce background";
        if (tool === 'upscale_v4' || tool === 'super_resolution') promptText += ", high resolution, 4k upscaled detail";

        const response = await fetch(astriaEndpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ASTRIA_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: {
                    text: promptText,
                    image_url: imageUrl,
                    num_images: 1,
                    model: "seedream-4.5"
                }
            }),
        });

        if (!response.ok) {
            console.error("Astria API failed:", await response.text());
            return NextResponse.json({ error: "Failed to process image tool." }, { status: 500 });
        }

        const astriaData = await response.json() as any;
        const resultUrl = astriaData?.images?.[0];

        if (!resultUrl) {
            return NextResponse.json({ error: "No image generated." }, { status: 500 });
        }

        // 3. Buffer download and Supabase upload
        const imgRes = await fetch(resultUrl);
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `${user.id}/${Date.now()}_tool.png`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from("generated-images")
            .upload(`generated/${fileName}`, buffer, {
                contentType: "image/png",
                upsert: true,
            });

        if (uploadError) {
            logger.error("Image Tool upload failed", { error: uploadError });
            return NextResponse.json({ error: "Failed to upload result." }, { status: 500 });
        }

        const { data: urlData } = supabaseAdmin.storage
            .from("generated-images")
            .getPublicUrl(`generated/${fileName}`);

        // 4. Deduct credits
        await supabaseAdmin
            .from("credits")
            .update({ credits_remaining: creditsData.credits_remaining - credits_cost })
            .eq("user_id", user.id);

        logger.generation("completed", user.id, "sync-tool", "completed", { tool, url: urlData.publicUrl });

        return NextResponse.json({
            success: true,
            image_url: urlData.publicUrl,
        });

    } catch (error: any) {
        logger.error("Image Tools API Error", { error: error.message });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
