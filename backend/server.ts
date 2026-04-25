import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_API_KEY,
});

const app = express();

app.use(cors({
  origin: true, // ✅ allows all origins (prevents Vercel domain issues)
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`🌍 INCOMING: ${req.method} ${req.url}`);
  next();
});

// ✅ SUPABASE INIT
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://gbwhgpslkpreghfvaubk.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ 10. HEALTH CHECK ROUTE
app.get("/health", (req, res) => res.send("ok"));

app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ 9. BASIC RATE LIMIT
const rateLimitCache: Record<string, { count: number; resetTime: number }> = {};
function checkRateLimit(userId: string) {
  const now = Date.now();
  if (!rateLimitCache[userId]) {
    rateLimitCache[userId] = { count: 1, resetTime: now + 60000 };
    return true;
  }
  if (now > rateLimitCache[userId].resetTime) {
    rateLimitCache[userId] = { count: 1, resetTime: now + 60000 };
    return true;
  }
  if (rateLimitCache[userId].count >= 10) {
    return false;
  }
  rateLimitCache[userId].count++;
  return true;
}

// ✅ HEALTH CHECK ROUTE
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ MAIN GENERATION ROUTE
app.post("/api/generate", async (req, res) => {
  try {
    const { productImage, template, prompt, imageCount, model: reqModel, category, varyStyle, improveQuality, consistencyMode } = req.body;

    // ✅ HARD VALIDATION
    if (!productImage) throw new Error("Missing product image");
    if (!template) throw new Error("Missing template");

    console.log("IMAGE URL:", productImage);
    console.log("COUNT REQUESTED:", imageCount);

    // ✅ VERIFY IMAGE ACCESS
    const check = await fetch(productImage, { method: "HEAD" });
    if (!check.ok) throw new Error("Image not accessible");

    const templateMap: Record<string, string> = {
      studio: "clean white studio background with soft gradient and subtle shadow",
      editorial: "luxury fashion editorial background with soft gradients and premium lighting",
      streetwear: "urban street environment with natural lighting and realistic depth",
      luxury: "high-end premium brand scene with dramatic lighting and elegant background",
      minimal: "minimal clean background with smooth gradient and soft shadow"
    };

    // 1. BASE PROMPT
    let basePrompt = `
Use the provided product image as the EXACT subject.

CRITICAL RULES:
- The product MUST remain 100% identical
- Do NOT change shape, color, material, branding, or logo
- Do NOT redesign or replace the product
- Only ONE product must exist in the scene

COMPOSITION:
- Product centered and clearly visible
- Clean framing with professional product photography angle
- Maintain original proportions and geometry

SCENE:
${templateMap[template] || "minimal premium studio background"}

LIGHTING:
- Soft studio lighting
- Realistic shadows under product
- High-end commercial lighting setup
- Natural reflections based on material

STYLE:
- Ultra realistic
- High-end commercial photography
- Ecommerce ready (Amazon / Shopify)
- Clean background with no clutter

DETAIL ENHANCEMENT:
- Sharp focus on product edges and textures
- Preserve fine material details (metal, glass, fabric, plastic)
- High clarity, no blur
- Accurate reflections and highlights

STRICT NEGATIVE:
- no humans
- no hands
- no multiple products
- no random objects
- no distortion
- no background clutter
- no text overlays
- no logos added or modified
- no studio equipment visible

OUTPUT:
Professional commercial product photo, premium brand quality, ultra realistic
`;

    // SMART AUGMENTATIONS
    if (varyStyle) basePrompt += "\nSlightly vary background composition while preserving product.";
    if (improveQuality) basePrompt += "\nImprove lighting, clarity, and composition.";
    if (consistencyMode) basePrompt += "\nMaintain consistent style across multiple generations.";
    if (prompt) basePrompt += "\n\nUser Request: " + prompt;

    // CATEGORY ENHANCEMENT
    const categoryEnhancer: Record<string, string> = {
      fashion: "fabric texture detail, soft shadows, lifestyle premium look",
      cosmetics: "glossy reflections, clean luxury skincare lighting, soft gradients",
      jewelry: "high sparkle reflections, gemstone shine, metallic highlights"
    };

    const finalPrompt = `
${basePrompt}

CATEGORY ENHANCEMENT:
${categoryEnhancer[category || ""] || ""}
`;

    // MODEL-SPECIFIC PROMPT BOOST
    const fluxPrompt = `
${finalPrompt}

STRICT:
Maintain exact product identity with ZERO variation.
Do not modify structure under any condition.
`;

    const seedreamPrompt = `
${finalPrompt}

CREATIVE MODE:
Add premium cinematic styling and background aesthetics.

STRICT:
Preserve exact product geometry and branding.
Do NOT alter structure or shape.
Only enhance environment and lighting.
`;

    // 2. MODEL
    const selectedModel = reqModel || "standard";
    const model = selectedModel === "seedream"
      ? "fal-ai/bytedance/seedream/v4.5/edit"
      : "fal-ai/flux-2-pro";

    // 3. FINAL INPUT CONFIG
    const fluxInput = {
      prompt: fluxPrompt,
      image_url: productImage,
      num_images: Math.min(Number(imageCount) || 1, 2),
    };

    const seedreamInput = {
      prompt: seedreamPrompt,
      image_urls: [productImage], // IMPORTANT
      num_images: Math.min(Number(imageCount) || 1, 2),
    };

    const input = selectedModel === "seedream" ? seedreamInput : fluxInput;

    // 6. TIMEOUT
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    // 7. SAFE FALLBACK SYSTEM
    let result: any;

    try {
      result = await fal.subscribe(model, { 
        input,
        signal: controller.signal
      });
    } catch (err) {
      console.log("Fallback to flux-2-pro");
      result = await fal.subscribe("fal-ai/flux-2-pro", { input: fluxInput });
    }

    clearTimeout(timeout);

    console.log("FAL RAW RESPONSE:", JSON.stringify(result, null, 2));

    // ✅ SAFE RESPONSE EXTRACTION
    let images =
      result?.data?.images?.map((img: any) => img.url) ||
      result?.images?.map((img: any) => img.url) ||
      [];

    if (!images.length) {
      throw new Error("No images generated");
    }

    // ✅ BEST OF N (Return only the best/first 1)
    images = [images[0]];

    console.log("FINAL IMAGES COUNT (Returned):", images.length);

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({
      error: err.message || "Generation failed"
    });
  }
});

const PORT = process.env.PORT;

if (!PORT) {
  console.error("❌ PORT not found from Render");
  process.exit(1);
}

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅ Server running on ${PORT}`);
});
