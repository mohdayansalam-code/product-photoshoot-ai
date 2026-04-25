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
  console.log("=== GENERATE START ===");
  console.log("BODY:", req.body);

  try {
    const { prompt, productImage, template, imageCount = 1 } = req.body;

    // ✅ HARD VALIDATION
    if (!productImage || !productImage.includes("supabase.co")) {
      return res.status(400).json({
        error: "Invalid or missing product image"
      });
    }

    if (!template) {
      return res.status(400).json({ success: false, error: "Missing template" });
    }

    // ✅ TEMPORARILY DISABLED USAGE LOGIC TO PREVENT 500 ERRORS
    // -------------------------------------------------------------
    /*
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing auth header" });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid token" });
    }
    const userId = user.id;

    let { data: userUsage, error: usageError } = await supabase.from('users_usage').select('*').eq('user_id', userId).single();
    const now = new Date();
    if (!userUsage) {
      const { data: newUsage, error: insertError } = await supabase.from("users_usage").upsert({ user_id: userId, images_used: 0, last_reset: now.toISOString() }).select().single();
      if (insertError) throw new Error("Failed to initialize user usage");
      userUsage = newUsage;
    }
    let images_used = userUsage.images_used || 0;
    const lastReset = new Date(userUsage.last_reset || userUsage.last_reset_date || now);
    const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
    if (isNewMonth) {
      images_used = 0;
      await supabase.from('users_usage').update({ images_used: 0, last_reset: now.toISOString() }).eq('user_id', userId);
    }
    const LIMIT = 10;
    if (images_used + imageCount > LIMIT) {
      return res.status(403).json({ success: false, error: "Monthly limit reached" });
    }
    */
    // -------------------------------------------------------------

    // ✅ CONTROLLED PROMPT (NO RANDOM DEFAULTS)
    const templateMap: Record<string, string> = {
      studio: "clean white studio background, soft shadows",
      editorial: "luxury fashion magazine photoshoot, dramatic lighting",
      ecommerce: "plain background, centered product, shadow",
      lifestyle: "realistic environment, natural lighting",
    };

    const basePrompt = `
Use the provided product image as the EXACT subject.

STRICT RULES:
- DO NOT generate a new product
- DO NOT change product shape, color, branding
- KEEP the product identical

Scene:
${templateMap[template] || template}

Composition:
- centered product
- realistic shadow under product

Lighting:
- soft studio lighting
- natural reflections

Style:
- ultra realistic
- ecommerce ready
- clean background

NEGATIVE:
- no extra products
- no clutter
- no distortion
- no fake objects
`;

    const finalPrompt = prompt?.trim()
      ? `${basePrompt}\nExtra details: ${prompt}`
      : basePrompt;

    console.log("REQUEST:", { imageCount, productImage, template });
    console.log("IMAGE RECEIVED:", productImage);

    try {
      const check = await fetch(productImage, { method: "HEAD" });

      if (!check.ok) {
        throw new Error("Image not accessible");
      }
    } catch (err) {
      console.error("IMAGE ACCESS ERROR:", err);
      return res.status(400).json({
        error: "Product image URL is broken"
      });
    }

    // ✅ CALL FAL
    const result: any = await fal.subscribe("fal-ai/flux-kontext-pro", {
      input: {
        prompt: finalPrompt,
        image_url: productImage,
        num_images: Number(imageCount) || 1,
        guidance_scale: 8,
        num_inference_steps: 30
      },
    });

    console.log("FAL RAW RESULT:", JSON.stringify(result, null, 2));

    const images = result?.data?.images || [];

    if (!images.length) {
      throw new Error("No images returned from Fal");
    }

    console.log("IMAGES COUNT:", images.length);

    /*
    // Step 5: Update Usage AFTER success
    images_used += imageCount;
    await supabase.from('users_usage').update({ images_used }).eq('user_id', userId);
    */

    // Step 6: Return Response
    return res.status(200).json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message || "Generation failed",
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
