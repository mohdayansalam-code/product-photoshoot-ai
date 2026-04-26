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
Use the provided product image as the EXACT subject.

INPUT PRIORITY:
1. Product image (MANDATORY)
2. Model face (if provided → MUST be used)
3. Background image or selected template (MANDATORY)

CRITICAL RULES:
- Keep product 100% identical (shape, logo, material, proportions)
- DO NOT replace or redesign product
- ONLY one product allowed

MODEL FACE RULE:
- If face is provided → MUST appear naturally
- Match lighting, angle, and perspective
- Do NOT ignore face

BACKGROUND RULE:
- Use uploaded background or selected template EXACTLY
- Do NOT replace background
- Match lighting with product

COMPOSITION:
- Product clearly visible
- Clean framing
- Professional product photography

SCENE/ENVIRONMENT:
${selectedBackground}

LIGHTING:
- realistic shadows
- match environment lighting
- premium commercial look

STYLE:
- ecommerce ready
- ad-ready output
- clean + premium

STRICT NEGATIVE:
- no extra objects
- no multiple products
- no distortion
- no ignoring inputs
- no random backgrounds

OUTPUT:
High-end commercial product image using ALL provided inputs correctly
`;

    if (prompt) finalPrompt += "\n\nUser Request: " + prompt;

    // 3. FINAL INPUT CONFIG
    const model = "openai/gpt-image-2/edit";
    const input = {
      prompt: finalPrompt,
      image_urls: [
        productImage,
        ...(modelFace ? [modelFace] : []),
        ...(backgroundImage ? [backgroundImage] : [])
      ],
      num_images: Math.min(Number(imageCount) || 1, 4)
    };

    const runWithTimeout = (promise: Promise<any>, ms: number) => {
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Timeout"));
        }, ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
      });
    };

    console.log("🚀 Running Pipeline with model:", model);
    console.log("Input images count:", input.image_urls.length);
    
    let result;
    try {
      result = await runWithTimeout(fal.subscribe(model, { input }), 120000);
    } catch (err) {
      console.log("Generation failed, retrying once...");
      try {
        result = await runWithTimeout(fal.subscribe(model, { input }), 120000);
      } catch (retryErr) {
        throw retryErr;
      }
    }

    const finalImages: { type: string, url: string }[] = [];

    if (result && (result.data?.images || result.images)) {
      const generatedImages = result.data?.images || result.images;
      for (const img of generatedImages) {
        if (img.url) finalImages.push({ type: "ecommerce", url: img.url });
      }
    }

    if (finalImages.length === 0) {
      throw new Error("Model failed to generate images");
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
