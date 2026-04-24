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
  origin: [
    "https://product-photoshoot-ai-nu.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
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
    const { prompt } = req.body;

    const result: any = await fal.subscribe("fal-ai/fast-sdxl", {
      input: {
        prompt: prompt || "studio product photoshoot",
        image_size: "square_hd",
      },
    });

    console.log("FAL RAW RESULT:", JSON.stringify(result, null, 2));

    // 🔥 SAFE EXTRACTION (handles all Fal formats)
    const images =
      result?.data?.images ||
      result?.images ||
      (result?.image ? [{ url: result.image }] : []);

    if (!images || images.length === 0) {
      throw new Error("No images returned from Fal");
    }

    const imageUrls = images.map((img: any) => img.url || img);

    console.log("✅ FINAL IMAGES:", imageUrls);

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
