console.log("🚀 CORRECT SERVER FILE IS RUNNING");
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
    // ✅ 1. SECURE USER ID
    const token = req.headers.authorization?.replace("Bearer ", "");
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
    if (!productImage) return res.status(400).json({ error: "Product image is required" });
    if (!input) return res.status(400).json({ error: "Template is required" });
    if (requiresModel && !faceImage) return res.status(400).json({ error: "Face image is required for this template" });

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
        console.error("Usage initialization failed:", insertErr);
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

    console.log("📥 REQUEST:", { user_id, template: input, status: "processing" });

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
      console.error("Fal API Error:", falErr);
      return res.status(500).json({
        error: "Generation failed"
      });
    }

    if (!images || images.length === 0) {
      return res.status(500).json({ error: "Generation failed - No images returned" });
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

    console.log("✅ SUCCESS:", { user_id, template: input, status: "success" });

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
