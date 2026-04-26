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
Use the provided images exactly as inputs.

PRIMARY SUBJECT:
* The product image is the MAIN subject
* The product must remain 100% identical (shape, color, logo, texture, proportions)
* Do NOT redesign or replace the product

FACE USAGE (if provided):
* The model face MUST be used
* Place the face naturally in the scene (wearing / holding / aligned with product)
* Match lighting, color tone, and perspective with the product
* Do NOT generate a different face

BACKGROUND (if provided):
* Use the provided background image exactly
* Do NOT replace or ignore it
* Match lighting and shadows with the product and face

COMPOSITION:
* Single product only
* Centered or professionally framed
* Clean ecommerce or premium ad layout
* No clutter

LIGHTING:
* Realistic shadows
* Consistent lighting across product, face, and background
* High-end commercial photography look

STYLE:
* Ecommerce ready
* Shopify / Ads quality
* Ultra realistic
* Sharp focus, high detail

STRICT NEGATIVE:
* no product distortion
* no changing product design
* no extra objects
* no multiple products
* no random backgrounds
* no ignoring inputs

OUTPUT:
Ultra realistic commercial product image using ALL provided inputs correctly.
`;

    if (customPrompt) finalPrompt += "\n\nUser Request: " + customPrompt;

    logger.info(`Starting fal.ai generation pipeline.`);
    
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

    const generate = async () => {
      const timeout = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout exceeded")), 180000)
      );

      const result = await Promise.race([
        fal.subscribe(model, { input }),
        timeout
      ]);

      const extracted = extractImages(result);
      if (extracted.length > 0) {
        return extracted;
      } else {
        throw new Error("Model failed to return images");
      }
    };

    let output;
    try {
      output = await generate();
      logger.info(`Successfully generated ${output.length} images from fal.ai pipeline`);
    } catch (e: any) {
      logger.warn(`fal.ai Pipeline Error: ${e.message}. Retrying once...`);
      await new Promise(r => setTimeout(r, 2000)); // wait 2s before retry
      output = await generate();
      logger.info(`Successfully generated ${output.length} images from fal.ai pipeline on retry`);
    }

    return output;
  } catch (err) {
    console.error("❌ FAL ERROR:", err);
    throw err;
  }
}

// Backward compatibility alias for other files
export const generateImageWithFal = runFalGeneration;

