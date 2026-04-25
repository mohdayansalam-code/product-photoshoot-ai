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

// ✅ MAIN GENERATION ROUTE
app.post("/api/generate", async (req, res) => {
  try {
    const { productImage, template, prompt, imageCount } = req.body;

    // ✅ HARD VALIDATION
    if (!productImage) {
      return res.status(400).json({ error: "Missing product image" });
    }

    if (!template) {
      return res.status(400).json({ error: "Missing template" });
    }

    console.log("IMAGE RECEIVED:", productImage);
    console.log("COUNT REQUESTED:", imageCount);

    // ✅ VERIFY IMAGE ACCESS
    const check = await fetch(productImage, { method: "HEAD" });
    if (!check.ok) {
      return res.status(400).json({ error: "Image not accessible" });
    }

    // ✅ TEMPLATE MAP (CLEAN)
    const templateMap: Record<string, string> = {
      editorial: "luxury fashion magazine, dramatic lighting",
      studio: "clean white studio, soft shadows",
      ecommerce: "amazon style product, minimal background"
    };

    // ✅ FINAL PROMPT (BALANCED — NOT TOO STRICT)
    const finalPrompt = `
Use the provided product image as the main subject.

Keep product shape, color, and branding EXACT.

Scene: ${templateMap[template] || template}

Lighting: professional studio lighting
Camera: 50mm lens, sharp focus

No distortion, no multiple objects, no humans.
Clean commercial product photography.
${prompt || ""}
`;

    // ✅ SAFE IMAGE COUNT
    const count = Math.min(Math.max(Number(imageCount) || 1, 1), 4);

    console.log("FINAL COUNT:", count);

    // ✅ CALL FAL (IMPORTANT)
    const result: any = await fal.subscribe("fal-ai/flux-kontext-pro", {
      input: {
        prompt: finalPrompt,
        image_url: productImage,
        num_images: count,
        guidance_scale: 7,
        num_inference_steps: 28
      }
    });

    console.log("FAL RAW RESPONSE:", JSON.stringify(result, null, 2));

    // ✅ NORMALIZE RESPONSE (CRITICAL FIX)
    let images: string[] = [];

    if (result?.images && Array.isArray(result.images)) {
      images = result.images.map((img: any) => img.url || img);
    } else if (result?.output && Array.isArray(result.output)) {
      images = result.output.map((img: any) => img.url || img);
    } else if (result?.data?.images && Array.isArray(result.data.images)) {
      images = result.data.images.map((img: any) => img.url || img);
    } else {
      throw new Error("Invalid Fal response format");
    }

    console.log("FINAL IMAGES COUNT:", images.length);

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({
      error: "Generation failed"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
