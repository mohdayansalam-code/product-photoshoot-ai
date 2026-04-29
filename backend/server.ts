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

// ✅ USAGE CHECK ROUTE
app.get("/api/usage", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Missing authorization" });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const { data } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('month', monthKey)
      .maybeSingle();

    console.log("USAGE FETCH:", user.id, data);

    return res.json({ used: data?.count || 0, limit: 10 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ✅ MAIN GENERATION ROUTE
app.post("/api/generate", async (req, res) => {
  try {
    // ✅ AUTHENTICATION
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
      backgroundImage,
      useModel,
      aspectRatio
    } = req.body;

    const parsedImageCount = Number(imageCount) || 1;

    // ✅ MONTHLY LIMIT CHECK
    const LIMIT = 10;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    const { data: usageRow, error: usageError } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('month', monthKey)
      .maybeSingle();

    const used = usageRow?.count || 0;

    if (used + parsedImageCount > LIMIT) {
      return res.status(400).json({ error: `Monthly limit reached (10 images)` });
    }

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
AI PRODUCT PHOTOSHOOT — STRICT GENERATION MODE

Use the provided product image as the EXACT subject.

-----------------------------------------------------

🔒 CRITICAL PRODUCT RULES (NON-NEGOTIABLE)
- The product MUST remain 100% identical
- Do NOT change shape, color, material, logo, or proportions
- Do NOT redesign or replace the product
- Only ONE product must exist
- No duplicates, no variations

-----------------------------------------------------

👤 MODEL USAGE (CONDITIONAL)

IF useModel = true:
- Use the provided model face
- Integrate naturally with the product
- Face must look realistic and aligned with lighting

IF useModel = false:
- STRICT: Do NOT include any human, model, or face

-----------------------------------------------------

🖼 BACKGROUND RULES

IF background image provided:
- MUST use the exact background
- Match lighting, shadows, and perspective

IF no background:
- Use a clean, premium, minimal environment
- No clutter, no random objects

-----------------------------------------------------

📐 COMPOSITION

- Centered or professionally framed product
- Clean composition
- Balanced spacing
- No cropping of the product
- Full product must be visible

-----------------------------------------------------

💡 LIGHTING

- Soft professional studio lighting
- Realistic shadows under product
- Premium commercial look
- High-end ecommerce style

-----------------------------------------------------

📏 OUTPUT SIZE (STRICT)

- Output MUST match selected aspect ratio
- Do NOT default to square unless 1:1
- No cropping, stretching, or distortion
- Fill entire frame correctly

-----------------------------------------------------

🎯 STYLE

- Ultra realistic
- High-end commercial photography
- Shopify / Amazon ready
- Clean, sharp, premium branding quality

-----------------------------------------------------

🚫 STRICT NEGATIVE RULES

- No multiple products
- No humans (if model OFF)
- No distortion
- No random objects
- No messy backgrounds
- No bedroom / home scenes
- No text overlays
- No watermark
- No studio equipment visible

-----------------------------------------------------

📌 FINAL OUTPUT

Ultra-realistic, high-end commercial product image ready for ads and ecommerce.
`;

    if (prompt) finalPrompt += "\n\nUser Request: " + prompt;

    if (!useModel) {
      finalPrompt += "\n\nSTRICT: Do NOT include any human or model.";
    }

    if (useModel) {
      finalPrompt += "\n\nSTRICT: Use provided model face naturally.";
    }

    // 3. FINAL INPUT CONFIG
    const model = req.body.model === "seedream" 
      ? "fal-ai/bytedance/seedream/v4.5/edit" 
      : "openai/gpt-image-2/edit";

    if (aspectRatio) {
      if (model === "fal-ai/bytedance/seedream/v4.5/edit") {
        finalPrompt += `\n\nSTRICT IMAGE FORMAT:\n- Must follow ${aspectRatio}\n- No cropping\n- No stretching`;
      } else {
        finalPrompt += `\n\nSTRICT OUTPUT SIZE:\n- Output MUST match ${aspectRatio}\n- Do NOT generate square if not 1:1\n- Fill full frame properly`;
      }
    }

    const safeImageCount = model === "openai/gpt-image-2/edit"
      ? Math.min(Number(imageCount) || 1, 2)
      : Math.min(Number(imageCount) || 1, 4);

    const image_urls = [];
    if (useModel && modelFace) {
      image_urls.push(modelFace);
    }
    image_urls.push(productImage);
    if (backgroundImage) {
      image_urls.push(backgroundImage);
    }

    const sizeMap: Record<string, string> = {
      "1:1": "1024x1024",
      "4:5": "1024x1280",
      "16:9": "1280x720",
      "9:16": "720x1280"
    };
    const selectedSize = sizeMap[aspectRatio] || "1024x1024";

    const input = {
      prompt: finalPrompt,
      image_urls: image_urls,
      num_images: safeImageCount,
      size: selectedSize
    };

    console.log("🚀 Running Pipeline with model:", model);
    console.log("Input images count:", input.image_urls.length);
    console.log("ASPECT:", aspectRatio);
    console.log("SIZE:", selectedSize);

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

    // ✅ INCREMENT AFTER SUCCESS (NO RPC)
    if (images.length > 0) {
      const generated = images.length;

      const now = new Date();
      const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

      // 1. get existing usage
      const { data: existing } = await supabase
        .from("daily_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("month", monthKey)
        .maybeSingle();

      const used = existing?.count || 0;

      // 2. update or insert
      if (!existing) {
        // first time this month
        const { error } = await supabase.from("daily_usage").insert({
          user_id: user.id,
          month: monthKey,
          count: generated
        });
        if (error) console.error("❌ MONTHLY USAGE UPDATE FAILED:", error);
      } else {
        // increment
        const { error } = await supabase
          .from("daily_usage")
          .update({ count: used + generated })
          .eq("user_id", user.id)
          .eq("month", monthKey);
        if (error) console.error("❌ MONTHLY USAGE UPDATE FAILED:", error);
      }
      
      console.log(`✅ User ${user.id} monthly usage updated`);
    }

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
