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

    const selectedBackground = backgroundImage ? "the provided uploaded background image" : (baseScene + (safePrompt ? ", " + safePrompt : ""));

    let finalPrompt = `
ULTRA STRICT IMAGE GENERATION — ALL INPUTS MUST BE USED

INPUT ORDER (CRITICAL):
- Image 1 = MODEL FACE (if provided)
- Image 2 = PRODUCT (MANDATORY)
- Image 3 = BACKGROUND (if provided)

================================

CORE OBJECTIVE:
Generate a high-end commercial product image using ALL provided inputs.

================================

🔒 PRODUCT LOCK (HIGHEST PRIORITY)
- The product MUST be EXACTLY the same as input
- Preserve 100%: shape, logo, proportions, color, material
- DO NOT redesign, replace, or reinterpret the product
- If product changes → INVALID OUTPUT

================================

👤 FACE ENFORCEMENT (MANDATORY IF PROVIDED)
- The FIRST image is the human face — MUST be used
- The final image MUST include this exact face
- Face must be:
  - clearly visible
  - realistic
  - properly blended
- Match lighting, skin tone, angle, perspective
- DO NOT ignore, crop out, or replace face
- If face missing → INVALID OUTPUT

================================

🖼️ BACKGROUND ENFORCEMENT
- Use provided background or template EXACTLY
- DO NOT replace with studio/random background
- Match lighting and depth with subject
- If background ignored → INVALID OUTPUT

================================

📸 COMPOSITION (VERY IMPORTANT)
- Show human model wearing / holding / interacting with product
- Face clearly visible + product clearly visible
- ONE product only
- No extra objects

================================

💡 LIGHTING
- Match lighting across face, product, and background
- Realistic shadows
- Premium commercial photography quality

================================

🎯 STYLE
- Ecommerce + Ad ready
- Clean, premium, high-end branding
- Natural, not artificial

================================

🚫 STRICT NEGATIVE RULES
- no different product
- no multiple products
- no ignoring face
- no ignoring background
- no distortion
- no random objects
- no studio override
- no cropping out face

================================

FINAL VALIDATION (MUST PASS ALL):
✔ Product identical  
✔ Face clearly used  
✔ Background applied  
✔ Clean composition  

If ANY condition fails → regenerate correctly
`;

    if (customPrompt) finalPrompt += "\n\nUser Request: " + customPrompt;

    logger.info(`Starting fal.ai generation pipeline.`);
    
    let attempt = 0;
    const maxRetries = 2;

    const model = "openai/gpt-image-2/edit";
    const input = {
      prompt: finalPrompt,
      image_urls: [
        ...(faceImage ? [faceImage] : []),
        productImage,
        ...(backgroundImage ? [backgroundImage] : [])
      ],
      num_images: Math.min(Number(imageCount) || 1, 4)
    };

    while (attempt <= maxRetries) {
        try {
            const result = await runWithTimeout(fal.subscribe(model, { input }), 120000);
            
            const extracted = extractImages(result);
            if (extracted.length > 0) {
                logger.info(`Successfully generated ${extracted.length} images from fal.ai pipeline`);
                return extracted;
            } else {
                logger.warn(`Model failed to return images on attempt ${attempt + 1}.`);
                throw new Error("Model failed");
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

