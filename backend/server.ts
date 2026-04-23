import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { runFalGeneration } from "./src/services/falProcessor";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
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
    console.log("=== GENERATE START ===");
    console.log("BODY:", req.body);

    const {
      productImage,
      faceImage,
      backgroundImage,
      prompt,
      template,
      imageCount,
    } = req.body;

    // 🔴 STRICT VALIDATION
    if (!productImage) throw new Error("Product image missing");
    if (!template) throw new Error("Template missing");
    if (!imageCount) throw new Error("Image count missing");

    if (!process.env.FAL_API_KEY) {
      throw new Error("FAL API key missing");
    }

    //--------------------------------------------------

    const payload = {
      prompt: prompt || "high quality product photoshoot",
      image_url: productImage,
    };

    console.log("FAL INPUT:", payload);

    //--------------------------------------------------

    const response = await fetch(
      "https://fal.run/fal-ai/fast-sdxl",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    console.log("FAL RESULT:", result);

    //--------------------------------------------------

    if (!result || !result.images || result.images.length === 0) {
      throw new Error("Fal returned empty result");
    }

    //--------------------------------------------------

    res.json({
      images: result.images.map((img: any) => img.url),
    });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);

    res.status(500).json({
      error: err.message || "Generation failed",
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
