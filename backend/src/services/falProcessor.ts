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

function extractImages(result: any) {
  return (
    result?.data?.images ||
    result?.images ||
    result?.output ||
    []
  ).map((img: any) => img.url || img);
}

async function runWithTimeout(promise: Promise<any>, ms = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    return await promise;
  } finally {
    clearTimeout(timeout);
  }
}

const categoryEnhancerMap: Record<string, string> = {
  fashion: `
- emphasize fabric texture, folds, stitching
- premium fashion lighting
`,
  cosmetics: `
- glossy reflections
- soft gradient lighting
- skincare commercial style
`,
  jewelry: `
- high sparkle reflections
- gemstone shine
- metallic highlights
- luxury black or gradient background
`,
  default: ``
};

export async function runFalGeneration(options: FalGenerationOptions): Promise<string[]> {
  try {
    console.log("FAL INPUT:", options);
    const { prompt, template, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType } = options;
    
    // 🧱 7. HARD VALIDATION (KEEP THIS ALWAYS)
    if (!productImage) {
      throw new Error("Missing product image");
    }

    const check = await fetch(productImage, { method: "HEAD" }).catch(() => null);
    if (!check || !check.ok) {
      throw new Error("Image not accessible");
    }

    // Sanitize user input
    let userPrompt = (template || prompt)?.trim() || "";
    if (userPrompt.length > 200) {
        userPrompt = userPrompt.substring(0, 200);
    }

    let baseScene = TEMPLATE_MAP[userPrompt] || "minimal luxury studio background";

    const safePrompt = customPrompt?.trim().slice(0, 200) || "";
    if (safePrompt) {
      baseScene = baseScene + ", " + safePrompt;
    }

    // Deduce niche from template
    const niche = userPrompt.split('_')[0];
    const categoryEnhancer = categoryEnhancerMap[niche?.toLowerCase()] || categoryEnhancerMap.default;

    const basePrompt = `
You are a professional commercial product photographer.

TASK:
Transform the provided product image into a high-end commercial product photo.

-----------------------------------
🔒 PRODUCT IDENTITY (NON-NEGOTIABLE)
-----------------------------------
- The uploaded product is the ONLY subject
- Preserve EXACT shape, geometry, proportions
- Preserve EXACT color, material, texture
- Preserve logo, branding, and details
- DO NOT redesign or replace the product
- DO NOT generate a different item

❗ If the product changes in any way → result is invalid

-----------------------------------
📸 COMPOSITION
-----------------------------------
- Single product only
- Centered or premium composition
- Clean framing
- No cropping or deformation

-----------------------------------
🎨 SCENE
-----------------------------------
${baseScene}

-----------------------------------
💡 LIGHTING
-----------------------------------
- Soft professional studio lighting
- Realistic shadows under product
- Natural reflections based on material

-----------------------------------
✨ STYLE
-----------------------------------
- High-end commercial photography
- Shopify / Amazon ready
- Ultra clean and premium look
- Sharp focus, high detail

-----------------------------------
🚫 STRICT NEGATIVE RULES
-----------------------------------
- No humans
- No hands
- No multiple products
- No random objects
- No background clutter
- No distortion
- No product replacement
- No text overlays
- No watermark

-----------------------------------
🎯 OUTPUT
-----------------------------------
Ultra realistic premium ecommerce product image
`;

    const fluxPrompt = `
${basePrompt}

${categoryEnhancer}

-----------------------------------
🔐 FLUX STRICT LOCK
-----------------------------------
This is an image-to-image task.

- The product MUST remain identical
- DO NOT hallucinate new objects
- DO NOT replace product with anything else
- Match exact geometry and proportions

STRICT: this is an image-to-image transformation using the provided image. The output must use the SAME product.
STRICT: do not generate a different object under any condition.

❗ If output product ≠ input product → FAIL

-----------------------------------
📦 PRIORITY
-----------------------------------
Accuracy over creativity
Exact product preservation is mandatory
`;

    const seedreamPrompt = `
${basePrompt}

${categoryEnhancer}

-----------------------------------
🎬 CREATIVE ENHANCEMENT
-----------------------------------
- Add premium commercial styling
- Cinematic lighting and shadows
- Luxury environment matching product type

-----------------------------------
🔒 PRODUCT SAFETY
-----------------------------------
- Keep product shape EXACT
- Do not modify structure or branding
- Only enhance environment

-----------------------------------
📦 PRIORITY
-----------------------------------
Creative background + premium lighting
WITHOUT changing the product
`;

    logger.info(`Starting fal.ai generation pipeline.`);
    
    let attempt = 0;
    const maxRetries = 2;

    while (attempt <= maxRetries) {
        try {
            // Determine image size mapping
            const mappedSize = aspectMap[aspectRatio || "1:1"] || "square";

            const fluxConfig = {
                prompt: fluxPrompt,
                image_url: productImage,
                num_images: 1,
                guidance_scale: 7,        // 🔥 strong lock
                num_inference_steps: 24,  // 🔥 more control
                image_size: mappedSize
            };

            const seedreamConfig = {
                prompt: seedreamPrompt,
                image_urls: [productImage],
                num_images: 1,
                guidance_scale: 5,
                num_inference_steps: 18,
                image_size: mappedSize
            };

            const jobsPromise = Promise.allSettled([
                runWithTimeout(fal.subscribe("fal-ai/flux-2-pro", { input: fluxConfig }), 120000),
                runWithTimeout(fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", { input: seedreamConfig }), 120000)
            ]);

            const results: any = await jobsPromise;
            
            const [fluxResult, seedreamResult] = results;
            
            const fluxImages = fluxResult.status === "fulfilled"
                ? extractImages(fluxResult.value)
                : [];
                
            if (fluxResult.status === "rejected") {
                logger.error("Flux generation failed:", fluxResult.reason);
            }

            const seedreamImages = seedreamResult.status === "fulfilled"
                ? extractImages(seedreamResult.value)
                : [];
                
            if (seedreamResult.status === "rejected") {
                logger.error("Seedream generation failed:", seedreamResult.reason);
            }

            const finalImages = [
                fluxImages[0] || null,
                seedreamImages[0] || null,
            ].filter(Boolean);
            
            if (finalImages.length > 0) {
                logger.info(`Successfully generated ${finalImages.length} images from fal.ai pipeline`);
                return finalImages;
            } else {
                logger.warn(`Both models failed to return images on attempt ${attempt + 1}.`);
                throw new Error("Both models failed");
            }
        } catch (error: any) {
            logger.error(`fal.ai Pipeline Error on attempt ${attempt + 1}: ${error.message}`, { error });
        }
        
        attempt++;
        if (attempt <= maxRetries) {
            logger.info(`Retrying fal.ai pipeline... (${attempt}/${maxRetries})`);
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

