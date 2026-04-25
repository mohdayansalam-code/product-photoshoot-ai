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

CRITICAL RULES (NON-NEGOTIABLE):
- The product must remain 100% identical
- Do NOT change shape, proportions, materials, or branding
- Do NOT redesign or generate a new product
- Only ONE product in the scene

COMPOSITION (STRICT):
- Product perfectly centered
- Straight camera angle (slight perspective allowed)
- Product occupies 60–75% of frame
- No cropping of product
- Clean margins around object

SCENE:
${templateMap[template] || "minimal premium gradient background"}

LIGHTING (CONTROLLED):
- Soft diffused studio lighting
- Balanced exposure (no overexposure)
- Realistic shadow directly under product
- Natural reflections based on material

STYLE (COMMERCIAL):
- Ultra realistic photography
- High-end brand advertising style
- Clean ecommerce composition
- Premium minimal aesthetic

DETAIL LOCK:
- Preserve fine textures (metal, leather, glass, plastic)
- Sharp edges, no blur
- Accurate reflections and highlights
- No smoothing or melting of product

BACKGROUND RULES:
- Background must NOT overpower product
- Keep depth subtle
- No clutter or distractions

STRICT NEGATIVE:
- no humans
- no hands
- no multiple products
- no floating objects
- no distortion
- no surreal effects
- no text
- no logos added
- no heavy props

OUTPUT:
High-end commercial product image, premium ecommerce quality, studio-grade realism
`;

    // SMART AUGMENTATIONS
    if (varyStyle) basePrompt += "\nSlightly vary background composition while preserving product.";
    if (improveQuality) basePrompt += "\nImprove lighting, clarity, and composition.";
    if (consistencyMode) basePrompt += "\nMaintain consistent style across multiple generations.";
    if (prompt) basePrompt += "\n\nUser Request: " + prompt;

    // CATEGORY ENHANCEMENT
    const categoryEnhancer: Record<string, string> = {
      fashion: "premium fabric texture, natural folds, soft lifestyle shadows",
      cosmetics: "glossy reflections, clean skincare aesthetic, soft gradients, luxury packaging lighting",
      jewelry: "high sparkle reflections, sharp gemstone highlights, metallic shine, luxury lighting"
    };

    const finalPrompt = `
${basePrompt}

CATEGORY FOCUS:
${categoryEnhancer[category || ""] || ""}
`;

    // MODEL-SPECIFIC PROMPT BOOST
    const fluxPrompt = `
${finalPrompt}

STRICT MODE:
Absolute product identity preservation.
Zero structural deviation allowed.
Prioritize accuracy over creativity.
`;

    const seedreamPrompt = `
${finalPrompt}

CREATIVE MODE:
Enhance environment with premium commercial styling.

CONTROL:
Do NOT modify product structure.
Only adjust lighting, background, and mood.
Keep product dominant in frame.
`;

    // 3. FINAL INPUT CONFIG
    const fluxInput = {
      prompt: fluxPrompt,
      image_url: productImage,
      num_images: 1,
    };

    const seedreamInput = {
      prompt: seedreamPrompt,
      image_urls: [productImage],
      num_images: 1,
    };

    // 4. SMART PIPELINE EXECUTION
    const runFlux = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      try {
        let result = await fal.subscribe("fal-ai/flux-2-pro", { input: fluxInput, signal: controller.signal });
        clearTimeout(timeout);
        return result;
      } catch (err) {
        clearTimeout(timeout);
        console.log("Flux failed, retrying once...");
        // Retry once
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 120000);
        try {
          let retryResult = await fal.subscribe("fal-ai/flux-2-pro", { input: fluxInput, signal: retryController.signal });
          clearTimeout(retryTimeout);
          return retryResult;
        } catch (retryErr) {
          clearTimeout(retryTimeout);
          throw retryErr; // If Flux completely fails, it throws
        }
      }
    };

    const runSeedream = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      try {
        let result = await fal.subscribe("fal-ai/bytedance/seedream/v4.5/edit", { input: seedreamInput, signal: controller.signal });
        clearTimeout(timeout);
        return result;
      } catch (err) {
        clearTimeout(timeout);
        console.log("Seedream failed. Returning null...");
        return null; // Seedream failure shouldn't crash the pipeline
      }
    };

    console.log("🚀 Running Smart Pipeline (Flux + Seedream)");
    const [fluxResult, seedreamResult] = await Promise.allSettled([
      runFlux(),
      runSeedream()
    ]);

    const finalImages: { type: string, url: string }[] = [];

    // Extract Flux
    if (fluxResult.status === "fulfilled" && fluxResult.value) {
      let url = fluxResult.value.data?.images?.[0]?.url || fluxResult.value.images?.[0]?.url;
      if (url) finalImages.push({ type: "ecommerce", url });
    }

    // Extract Seedream
    if (seedreamResult.status === "fulfilled" && seedreamResult.value) {
      let url = seedreamResult.value.data?.images?.[0]?.url || seedreamResult.value.images?.[0]?.url;
      if (url) finalImages.push({ type: "creative", url });
    }

    if (finalImages.length === 0) {
      throw new Error("Both models failed to generate images");
    }

    console.log("✅ FINAL IMAGES RETURNED:", finalImages.length);

    return res.json({
      success: true,
      images: finalImages
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
