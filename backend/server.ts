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
    const { productImage, template, prompt, imageCount, model: reqModel, category } = req.body;

    // ✅ HARD VALIDATION
    if (!productImage) throw new Error("Missing product image");
    if (!template) throw new Error("Missing template");

    console.log("IMAGE URL:", productImage);
    console.log("COUNT REQUESTED:", imageCount);

    // ✅ VERIFY IMAGE ACCESS
    const check = await fetch(productImage, { method: "HEAD" });
    if (!check.ok) throw new Error("Image not accessible");

    // ✅ TEMPLATE MAP (CLEAN)
    const templateMap: Record<string, string> = {
      editorial: "luxury fashion magazine, dramatic lighting",
      studio: "clean white studio, soft shadows",
      ecommerce: "amazon style product, minimal background"
    };

    const productTypePrompt = `
Product Type: ${category || "General"}

If jewelry:
- emphasize reflections, metallic shine, gemstone sparkle

If cosmetics:
- emphasize smooth surfaces, gloss, premium packaging lighting

If fashion:
- emphasize material texture, fabric detail, lifestyle composition
`;

    const finalPrompt = `
Use the provided product image as the EXACT subject.

CRITICAL:
- Preserve exact shape, color, branding, proportions
- Do NOT redesign or replace product
- Only ONE product

${productTypePrompt}

COMPOSITION:
- centered hero shot
- premium framing
- clean spacing

SCENE:
${templateMap[template] || "minimal premium studio background"}

LIGHTING:
- soft diffused lighting
- realistic shadow under product
- premium reflections (if applicable)

STYLE:
- ultra realistic
- luxury commercial photography
- high-end brand aesthetic

DETAILS:
- sharp edges
- clean reflections
- realistic materials
- high clarity

NEGATIVE:
- no humans
- no clutter
- no distortion
- no cheap lighting
- no messy background

OUTPUT:
Luxury-level product advertisement image
`;

    const detailEnhancer = `
Enhance fine details, material texture, reflections, and edges.
Ensure sharpness and professional lighting quality.
`;

    // ✅ SMART MODEL ROUTING
    const isStrictCategory = ["cosmetics", "jewelry"].includes((category || "").toLowerCase());

    const model = isStrictCategory
      ? "fal-ai/flux-kontext-pro"
      : (reqModel === "seedream"
          ? "fal-ai/seedream-4.5"
          : "fal-ai/flux-kontext-pro");

    // ✅ QUALITY MODE SWITCH
    const qualityMode = req.body.qualityMode || "premium"; // default to premium
    const steps = qualityMode === "premium" ? 24 : 18;
    const guidance = qualityMode === "premium" ? 6 : 5;

    // ✅ MODEL-SPECIFIC CONFIG (Generate 2 for Best-of-N)
    const requestImageCount = 2; // Always generate 2 for best-of-N

    const fluxConfig = {
      prompt: finalPrompt + `\nSTRICT:\nMaintain exact product identity with zero variation.\n` + detailEnhancer,
      image_url: productImage,
      num_images: requestImageCount,
      guidance_scale: guidance,
      num_inference_steps: steps,
    };

    const seedreamConfig = {
      prompt: finalPrompt + `\nAdd cinematic styling and premium composition.\n\nSTRICT:\nPreserve exact product geometry and branding.\nDo not alter structure.\n` + detailEnhancer,
      image_url: productImage,
      num_images: requestImageCount,
      guidance_scale: guidance,
      num_inference_steps: steps,
    };

    const input = model === "fal-ai/seedream-4.5" ? seedreamConfig : fluxConfig;

    // ✅ TIMEOUT + ABORT (NO HANGING)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    // ✅ RETRY + FALLBACK SYSTEM (CRITICAL)
    let result: any;
    let attempt = 0;

    while (attempt < 2) {
      try {
        result = await fal.subscribe(model, {
          input,
          signal: controller.signal,
        });

        if (result?.data?.images?.length > 0 || result?.images?.length > 0) break;
      } catch (err) {
        attempt++;
      }
    }

    if (!result || (!result.data?.images?.length && !result.images?.length)) {
      // fallback to Flux
      console.log("FALLING BACK TO FLUX KONTEXT PRO");
      result = await fal.subscribe("fal-ai/flux-kontext-pro", {
        input: fluxConfig,
      });
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
