import { logger } from "./logger";
import { fal } from "@fal-ai/client";
import { config } from "../config/env";

export interface FalGenerationOptions {
    prompt: string;
    productImage: string;
    faceImage?: string;
    backgroundImage?: string;
    aspectRatio?: string;
    imageCount?: number;
    customPrompt?: string;
    modelType?: string;
}

const TEMPLATE_MAP: Record<string, string> = {
  cosmetics_luxury_skincare: `
  luxury skincare product photoshoot,
  soft lighting, premium aesthetic,
  clean background, high-end commercial photography
  `,
  cosmetics_white_studio: `
  clean white studio product shot,
  minimal shadows, ecommerce style
  `,
  fashion_editorial: `
  editorial fashion shoot,
  high-end magazine style, dramatic lighting
  `,
  jewelry_dark_luxury: `
  luxury jewelry shoot,
  dark background, gold reflections, premium brand style
  `,
};

export async function generateImageWithFal(options: FalGenerationOptions): Promise<string[]> {
    const { prompt, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType } = options;
    
    // Sanitize user input
    let userPrompt = prompt?.trim() || "";
    if (userPrompt.length > 200) {
        userPrompt = userPrompt.substring(0, 200);
    }

    let basePrompt = TEMPLATE_MAP[userPrompt];

    if (!basePrompt && userPrompt) {
      basePrompt = userPrompt; // fallback for old system
    }

    if (!basePrompt) {
      basePrompt = "clean studio product shot";
    }

    if (customPrompt && customPrompt.trim() !== "") {
      basePrompt = basePrompt + ", " + customPrompt.trim();
    }

    // Enforce prompt template
    const finalPrompt = `Create a professional ecommerce product photoshoot.

IMPORTANT:
* Keep the product EXACTLY the same
* Do not change logo, shape, or color
* Maintain accurate proportions
* Preserve branding details

Scene:
${basePrompt}

Style:
* high-end commercial photography
* soft lighting
* realistic shadows
* sharp focus
* 4K quality`;

    console.log("USER PROMPT/TEMPLATE:", userPrompt);
    console.log("BASE PROMPT:", basePrompt);
    console.log("FINAL PROMPT:", finalPrompt);

    // Build image_urls dynamically
    const image_urls = [productImage];
    if (faceImage) image_urls.push(faceImage);
    if (backgroundImage) image_urls.push(backgroundImage);

    logger.info(`Starting fal.ai generation with ${image_urls.length} input images.`);
    
    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
        try {
            // Optional: timeout handling
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("FAL_TIMEOUT")), 60000)
            );

            // Determine image size mapping
            let mappedSize = "auto_2K";
            if (aspectRatio === "1:1") mappedSize = "square_hd";
            if (aspectRatio === "16:9") mappedSize = "landscape_16_9";
            if (aspectRatio === "9:16") mappedSize = "portrait_16_9";
            if (aspectRatio === "2:3") mappedSize = "portrait_4_3";
            if (aspectRatio === "3:4") mappedSize = "portrait_4_3";
            if (aspectRatio === "4:3") mappedSize = "landscape_4_3";
            if (aspectRatio === "3:2") mappedSize = "landscape_4_3";
            if (aspectRatio === "4:5") mappedSize = "portrait_4_3";
            
            // Optional model switch
            const falEndpoint = modelType === "flux" ? "fal-ai/flux-pro/v1.1" : "fal-ai/bytedance/seedream/v4.5/edit";

            const resultPromise = fal.subscribe(falEndpoint, {
                input: {
                    prompt: finalPrompt,
                    image_urls,
                    image_url: productImage, // some models use image_url instead of image_urls
                    num_images: imageCount || 2,
                    max_images: imageCount || 2,
                    image_size: mappedSize
                },
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        logger.info(`fal.ai job in progress...`);
                    }
                }
            });

            // Race against 60s timeout
            const result: any = await Promise.race([resultPromise, timeoutPromise]);
            
            if (result && result.images && result.images.length > 0) {
                const urls = result.images.map((img: any) => img.url);
                logger.info(`Successfully generated ${urls.length} images from fal.ai`);
                return urls;
            } else {
                logger.warn(`fal.ai returned empty images on attempt ${attempt + 1}.`);
            }
        } catch (error: any) {
            logger.error(`fal.ai API Error on attempt ${attempt + 1}: ${error.message}`, { error });
            if (error.message === "FAL_TIMEOUT") {
                logger.error("fal.ai job timed out after 60s.");
            }
        }
        
        attempt++;
        if (attempt <= maxRetries) {
            logger.info(`Retrying fal.ai... (${attempt}/${maxRetries})`);
            await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
        }
    }

    throw new Error("Generation failed after retries.");
}

