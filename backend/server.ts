import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { runFalGeneration } from "./src/services/falProcessor";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

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

  try {
    const body = req.body;
    console.log("BODY:", body);

    const {
      productImage,
      faceImage,
      backgroundImage,
      template,
      prompt,
      imageCount,
      aspectRatio,
      modelType,
    } = body;

    // ✅ VALIDATION
    if (!productImage) throw new Error("Missing product image");
    if (!template) throw new Error("Missing template");
    if (imageCount < 1 || imageCount > 4) throw new Error("Invalid image count");

    if (!process.env.FAL_API_KEY) {
      throw new Error("FAL API key missing");
    }

    // ✅ CALL FAL
    const result = await runFalGeneration({
      productImage,
      faceImage,
      backgroundImage,
      template,
      prompt,
      imageCount,
      aspectRatio,
      modelType,
    });

    console.log("FAL RESULT:", result);

    if (!result || result.length === 0) {
      throw new Error("Fal returned empty result");
    }

    return res.json({ images: result });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({
      error: err.message || "Generation failed",
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
