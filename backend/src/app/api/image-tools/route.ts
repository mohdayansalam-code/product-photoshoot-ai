/** @deprecated Migrating to /api/tools/[tool_name] structure */
import { NextRequest } from "next/server";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";
import { creditSystem } from "@/services/creditSystem";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function POST(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const body = await req.json();
        const { imageUrl, tool } = body;

        if (!imageUrl || !tool) {
            throw new ApiError(400, "Missing required fields");
        }

        if (tool === 'product_fix' && !config.features.productFix.enabled) {
             throw new ApiError(403, "Product Fix is currently disabled");
        }

        const ASTRIA_API_KEY = config.astria.apiKey;
        let credits_cost = 1;
        if (tool === 'upscale_v4') credits_cost = 4;
        else if (tool === 'super_resolution' || tool === 'face_correction') credits_cost = 2;
        else if (tool === 'product_fix') credits_cost = config.features.productFix.credits;

        await rateLimiter.checkLimit(supabaseAdmin, user.id, 10, 60000, "image_tools");
        await creditSystem.deductCredits(supabaseAdmin, user.id, credits_cost, "image_tools");

        if (!ASTRIA_API_KEY || ASTRIA_API_KEY === "") {
            // Mock response if no API key
            await new Promise(r => setTimeout(r, 1500));
            return standardResponse.success({
                image_url: imageUrl, 
            });
        }

        const astriaEndpoint = `https://api.astria.ai/tunes/690204/prompts`;

        let promptText = "A product photo";
        if (tool === 'remove_bg') promptText += ", transparent background, remove background";
        if (tool === 'white_bg') promptText += ", pure white ecommerce background";
        if (tool === 'upscale_v4' || tool === 'super_resolution') promptText += ", high resolution, 4k upscaled detail";
        if (tool === 'product_fix') promptText += ", fix product label distortions, correct packaging defects, improve text clarity, high quality";

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
            const errLog = await response.text();
            throw new ApiError(500, `Astria API failed: ${errLog}`);
        }

        const astriaData = await response.json() as any;
        const resultUrl = astriaData?.images?.[0];

        if (!resultUrl) {
           throw new ApiError(500, "No image generated from tool.");
        }

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
            await supabaseAdmin.rpc("refund_credits", { p_user_id: user.id, p_amount: credits_cost }).then(({ error }) => { if (error) logger.error(error.message) });
            logger.error("Image Tool upload failed", { error: uploadError });
            throw new ApiError(500, "Failed to upload result to storage");
        }

        const { data: urlData } = supabaseAdmin.storage
            .from("generated-images")
            .getPublicUrl(`generated/${fileName}`);

        logger.generation("completed", user.id, "sync-tool", "completed", { tool, url: urlData.publicUrl });

        return standardResponse.success({
            image_url: urlData.publicUrl,
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
