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
      editorial: "luxury fashion editorial scene, soft gradients, premium lighting",
      studio: "clean white studio, soft shadow, minimal aesthetic",
      ecommerce: "amazon-style product shot, pure background, sharp focus"
    };

    // 1. BASE PROMPT
    let basePrompt = `
Use the provided product image as the EXACT subject.

CRITICAL:
- Preserve 100% product identity (shape, color, logo, texture)
- Do NOT redesign, replace, or modify the product
- Only ONE product in the image

COMPOSITION:
- centered product
- clean framing
- professional product photography

SCENE:
${templateMap[template] || "minimal premium studio background"}

LIGHTING:
- soft diffused studio lighting
- realistic contact shadow under product
- high-end commercial lighting

STYLE:
- ecommerce ready
- Shopify / Amazon quality
- ultra clean background
- sharp focus

NEGATIVE:
- no humans
- no hands
- no extra objects
- no clutter
- no room scenes
- no distortion

OUTPUT:
ultra realistic, high-end commercial product image
`;

    // SMART AUGMENTATIONS
    if (varyStyle) basePrompt += "\nSlightly vary background composition while preserving product.";
    if (improveQuality) basePrompt += "\nImprove lighting, clarity, and composition.";
    if (consistencyMode) basePrompt += "\nMaintain consistent style across multiple generations.";
    if (prompt) basePrompt += "\n\nUser Request: " + prompt;

    // 2. MODEL
    const selectedModel = reqModel || "standard";
    const model = selectedModel === "creative"
      ? "fal-ai/flux-dev"
      : "fal-ai/flux-pro";

    // 3. FINAL INPUT CONFIG
    const input = {
      prompt: basePrompt,
      image_url: productImage,

      num_images: Math.min(Number(imageCount) || 1, 2),

      guidance_scale: selectedModel === "creative" ? 5 : 6,
      num_inference_steps: selectedModel === "creative" ? 18 : 22,
    };

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
      console.log("Fallback to flux-pro");
      result = await fal.subscribe("fal-ai/flux-pro", { input });
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
