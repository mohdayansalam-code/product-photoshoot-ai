import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { generateImageWithFal } from "./src/services/falProcessor";

const app = express();

app.use(cors());
app.use(express.json());

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
    console.log("=== GENERATE START ===")
    console.log("BODY:", req.body)

    if (!process.env.FAL_API_KEY) {
      throw new Error("FAL API key missing");
    }
    // ✅ 1. SECURE USER ID
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized - Invalid token" });
    }

    const user_id = user.id;

    if (!checkRateLimit(user_id)) {
      return res.status(429).json({ error: "Too many requests" });
    }

    const { template, prompt, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType, requiresModel } = req.body;

    const input = template || prompt;
    const requestedCount = imageCount || 2;

    // ✅ 7. BACKEND VALIDATION
    if (!productImage) throw new Error("Missing product image");
    if (!input) throw new Error("Missing template");
    if (requiresModel && !faceImage) throw new Error("Face image required");
    if (requestedCount < 1 || requestedCount > 4) throw new Error("Invalid image count");

    // ✅ 2. SAFE USAGE ROW (NO OVERWRITE)
    const { data: existingUsage } = await supabase
      .from("users_usage")
      .select("*")
      .eq("user_id", user_id)
      .single();

    let usage = existingUsage;
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (!usage) {
      const { data: newUsage, error: insertErr } = await supabase.from("users_usage").insert({
        user_id,
        images_used: 0,
        plan_limit: 30,
        reset_date: nextMonth.toISOString()
      }).select().single();
      
      if (insertErr) {
        return res.status(500).json({ error: "Failed to initialize account usage." });
      }
      usage = newUsage;
    }

    // ✅ 3. MONTHLY RESET
    if (new Date() > new Date(usage.reset_date)) {
      const { data: resetUsage } = await supabase.from("users_usage").update({
        images_used: 0,
        reset_date: nextMonth.toISOString()
      }).eq("user_id", user_id).select().single();
      
      if (resetUsage) usage = resetUsage;
    }

    // ✅ 4. LIMIT CHECK
    if (usage.images_used + requestedCount > usage.plan_limit) {
      return res.status(403).json({
        error: "Monthly image limit reached"
      });
    }

    // ✅ 8. FAIL-SAFE FAL CALL
    let images: string[] = [];
    try {
      images = await generateImageWithFal({
        prompt: input,
        productImage,
        faceImage,
        backgroundImage,
        aspectRatio,
        imageCount: requestedCount,
        customPrompt,
        modelType
      });
    } catch (falErr: any) {
      throw falErr;
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error("Fal returned empty result");
    }

    // ✅ 5. SAFE INCREMENT (AFTER SUCCESS ONLY)
    if (images?.length) {
      await supabase.from("users_usage").update({
        images_used: usage.images_used + requestedCount
      }).eq("user_id", user_id);
    }

    // ✅ 6. SAVE GENERATIONS (ONLY ON SUCCESS)
    if (images?.length) {
      await supabase.from("generations").insert({
        user_id,
        template: input,
        image_urls: images
      });
    }

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ GENERATE ERROR:", err);

    return res.status(500).json({
      error: err.message || "Generation failed"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
