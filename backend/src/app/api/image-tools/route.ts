/** @deprecated Migrating to /api/tools/[tool_name] structure */
import { NextRequest } from "next/server";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";
import { requireAuthenticatedUser } from "@/lib/routeAuth";
import { generateImageWithFal } from "@/services/falProcessor";

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

        const FAL_API_KEY = config.fal?.apiKey || "";
        let credits_cost = 1;
        if (tool === 'upscale_v4') credits_cost = 4;
        else if (tool === 'super_resolution' || tool === 'face_correction') credits_cost = 2;
        else if (tool === 'product_fix') credits_cost = config.features.productFix.credits;

        await rateLimiter.checkLimit(supabaseAdmin, user.id, 10, 60000, "image_tools");

        let promptText = 'A product photo';
        if (tool === 'remove_bg') promptText += ', transparent background, remove background';
        if (tool === 'white_bg') promptText += ', pure white ecommerce background';
        if (tool === 'upscale_v4' || tool === 'super_resolution') promptText += ', high resolution, 4k upscaled detail';
        if (tool === 'product_fix') promptText += ', fix product label distortions, correct packaging defects, improve text clarity, high quality';

        const falUrls = await generateImageWithFal({ prompt: promptText, productImage: imageUrl });
        const resultUrl = falUrls && falUrls.length > 0 ? falUrls[0] : null;

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
