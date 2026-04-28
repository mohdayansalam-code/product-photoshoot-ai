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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: usageRow } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const used = usageRow?.count || 0;
    return res.json({ used, limit: 10 });
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

    // ✅ DAILY LIMIT CHECK
    const LIMIT = 10;
    const today = new Date().toISOString().slice(0, 10);

    const { data: usageRow, error: usageError } = await supabase
      .from('daily_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    const used = usageRow?.count || 0;

    if (used + parsedImageCount > LIMIT) {
      return res.status(400).json({ error: `Daily limit reached (${used}/${LIMIT} used today).` });
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

    // ✅ ATOMIC INCREMENT AFTER SUCCESS
    if (images.length > 0) {
      const { error: usageUpsertError } = await supabase.rpc("increment_usage", {
        p_user_id: user.id,
        p_date: today,
        p_count: images.length
      });

      if (usageUpsertError) {
        console.error("❌ DAILY USAGE UPDATE FAILED:", usageUpsertError);
      } else {
        console.log(`✅ User ${user.id} daily usage updated`);
      }
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
