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
    const { 
      productImage, 
      template, 
      prompt, 
      imageCount, 
      model: reqModel, 
      category, 
      varyStyle, 
      improveQuality, 
      consistencyMode,
      modelFace,
      backgroundImage
    } = req.body;

    // ✅ HARD VALIDATION
    if (!productImage) throw new Error("Missing product image");
    if (!template && !backgroundImage) throw new Error("Missing template or background image");

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

    const selectedBackground = backgroundImage ? "the provided uploaded background image" : (templateMap[template] || "minimal premium gradient background");

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

    if (prompt) finalPrompt += "\n\nUser Request: " + prompt;

    // 3. FINAL INPUT CONFIG
    const model = req.body.model === "seedream" 
      ? "fal-ai/bytedance/seedream/v4.5/edit" 
      : "openai/gpt-image-2/edit";

    const safeImageCount = model === "openai/gpt-image-2/edit"
      ? Math.min(Number(imageCount) || 1, 2)
      : Math.min(Number(imageCount) || 1, 4);

    const input = {
      prompt: finalPrompt,
      image_urls: [
        ...(modelFace ? [modelFace] : []),
        productImage,
        ...(backgroundImage ? [backgroundImage] : [])
      ],
      num_images: safeImageCount
    };

    console.log("🚀 Running Pipeline with model:", model);
    console.log("Input images count:", input.image_urls.length);

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout exceeded")), 300000)
    );

    async function generate() {
      return await Promise.race([
        fal.subscribe(model, { input }),
        timeout
      ]);
    }
    
    let result: any;
    try {
      result = await generate();
    } catch (err) {
      console.log("Retrying...");
      await new Promise(r => setTimeout(r, 2000));
      result = await generate();
    }

    const images =
      result?.data?.images ||
      result?.images ||
      result?.output ||
      [];

    console.log("✅ FINAL IMAGES RETURNED:", images.length);

    return res.json({ success: true, images });

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
