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
    if (!productImage) {
      return res.status(400).json({
        success: false,
        error: "Product image is required",
      });
    }

    if (!template) {
      return res.status(400).json({
        success: false,
        error: "Template is required",
      });
    }

    // 1. Get user_id from auth
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

    // Fetch user usage row
    let { data: userUsage, error: usageError } = await supabase
      .from('users_usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    const now = new Date();

    // Edge Case 1: First-time user
    if (!userUsage) {
      const { data: newUsage, error: insertError } = await supabase
        .from("users_usage")
        .upsert({
          user_id: userId,
          images_used: 0,
          last_reset: now.toISOString(),
        })
        .select()
        .single();
        
      if (insertError) {
        console.error("SUPABASE ERROR:", insertError);
        throw new Error("Failed to initialize user usage");
      }
      userUsage = newUsage;
    }

    let images_used = userUsage.images_used || 0;
    const lastReset = new Date(userUsage.last_reset || userUsage.last_reset_date || now);

    // Step 2: Monthly Reset Logic (CRITICAL)
    const isNewMonth =
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    if (isNewMonth) {
      images_used = 0;
      await supabase
        .from('users_usage')
        .update({ images_used: 0, last_reset: now.toISOString() })
        .eq('user_id', userId);
    }

    // Step 3: Limit Check
    const LIMIT = 10;
    if (images_used + imageCount > LIMIT) {
      return res.status(403).json({
        success: false,
        error: "Monthly limit reached"
      });
    }

    // ✅ CONTROLLED PROMPT (NO RANDOM DEFAULTS)
    const templateMap: Record<string, string> = {
      editorial: "luxury fashion magazine photoshoot, dramatic lighting, premium studio background",
      studio: "clean white studio background, soft shadows, minimal setup",
      streetwear: "urban environment, concrete textures, natural lighting",
      cosmetics: "soft pastel background, beauty lighting, minimal aesthetic",
      ecommerce: "plain background, centered product, shadow under product"
    };

    const basePrompt = `
You are a professional product photography AI.

STRICT RULES:
- ONLY generate a PRODUCT photoshoot
- NO random environments without product
- NO empty scenes
- PRODUCT must be center focus

Scene: ${templateMap[template] || template}

Lighting:
- soft shadows
- studio lighting
- realistic reflections

Camera:
- 50mm lens
- shallow depth of field
- sharp focus

Quality:
- ultra realistic
- 4k
`;

    let finalPrompt = prompt?.trim()
      ? `${basePrompt}\n\nAdditional details:\n${prompt}`
      : basePrompt;

    finalPrompt += `

NEGATIVE PROMPT:
- no bedroom scenes
- no furniture unless required
- no random objects
- no messy backgrounds
- no multiple subjects
- no empty environment
- no studio equipment visible
`;

    console.log("FINAL PROMPT:", finalPrompt);

    // ✅ CALL FAL
    const result: any = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        image_url: productImage,
        prompt: finalPrompt,
        num_images: imageCount || 1,
      },
    });

    console.log("FAL RAW RESULT:", JSON.stringify(result, null, 2));

    const images =
      result?.data?.images ||
      result?.images ||
      (result?.image ? [{ url: result.image }] : []);

    if (!images || images.length === 0) {
      throw new Error("No images returned from Fal");
    }

    const imageUrls = images.map((img: any) => img.url || img);

    console.log("✅ FINAL IMAGES:", imageUrls);

    // Step 5: Update Usage AFTER success
    images_used += imageCount;
    await supabase
      .from('users_usage')
      .update({ images_used })
      .eq('user_id', userId);

    // Step 6: Return Response
    return res.status(200).json({
      success: true,
      images: imageUrls,
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
