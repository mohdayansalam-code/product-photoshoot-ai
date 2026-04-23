import { logger } from "./logger";
import { fal } from "@fal-ai/client";
import { config } from "../config/env";

export interface FalGenerationOptions {
    prompt: string;
    template?: string;
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
  fashion_streetwear: `
  streetwear fashion shoot,
  urban environment, edgy style, dramatic shadows
  `,
  jewelry_dark_luxury: `
  luxury jewelry shoot,
  dark background, gold reflections, premium brand style
  `,
  jewelry_marble: `
  elegant jewelry shoot on marble surface,
  natural light, soft reflections
  `,
  campaign_cosmetics_model: `
  cosmetics model interacting with skincare product,
  beauty campaign, high-end skin texture
  `,
  campaign_premium_ad: `
  premium campaign ad,
  high budget commercial look, cinematic lighting
  `
};

const aspectMap: Record<string, string> = {
  "1:1": "square",
  "16:9": "landscape_16_9",
  "9:16": "portrait_9_16",
  "2:3": "portrait_2_3",
  "3:4": "portrait_3_4",
  "1:2": "portrait_1_2",
  "2:1": "landscape_2_1",
  "4:5": "portrait_4_5",
  "3:2": "landscape_3_2",
  "4:3": "landscape_4_3"
};

export async function runFalGeneration(options: FalGenerationOptions): Promise<string[]> {
  try {
    console.log("FAL INPUT:", options);
    const { prompt, template, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType } = options;
    
    // Sanitize user input
    let userPrompt = (template || prompt)?.trim() || "";
    if (userPrompt.length > 200) {
        userPrompt = userPrompt.substring(0, 200);
    }

    if (!TEMPLATE_MAP[userPrompt]) {
      throw new Error("Invalid template");
    }

    let basePrompt = TEMPLATE_MAP[userPrompt];

    const safePrompt = customPrompt?.trim().slice(0, 200) || "";
    if (safePrompt) {
      basePrompt = basePrompt + ", " + safePrompt;
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
            const mappedSize = aspectMap[aspectRatio || "1:1"] || "square";
            
            // Optional model switch
            const safeModel = ["auto", "flux", "seedream"].includes(modelType || "") ? modelType : "auto";
            const falEndpoint = safeModel === "flux" ? "fal-ai/flux-pro/v1.1" : "fal-ai/bytedance/seedream/v4.5/edit";

            const payload = {
                prompt: finalPrompt,
                image_urls,
                image_url: productImage, // some models use image_url instead of image_urls
                num_images: imageCount || 2,
                max_images: imageCount || 2,
                image_size: mappedSize
            };
            
            console.log("FAL INPUT:", payload);

            const resultPromise = fal.subscribe(falEndpoint, {
                input: payload,
                logs: true,
                onQueueUpdate: (update) => {
                    if (update.status === "IN_PROGRESS") {
                        logger.info(`fal.ai job in progress...`);
                    }
                }
            });

            // Race against 60s timeout
            const result: any = await Promise.race([resultPromise, timeoutPromise]);
            
            console.log("FAL RAW RESULT:", result);
            
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
  } catch (err) {
    console.error("❌ FAL ERROR:", err);
    throw err;
  }
}

// Backward compatibility alias for other files
export const generateImageWithFal = runFalGeneration;

