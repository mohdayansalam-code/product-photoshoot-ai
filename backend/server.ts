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

// ✅ HEALTH CHECK (Render Stability)
app.get("/health", (req, res) => {
  res.send("ok");
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ RATE LIMITING
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
    const { template, prompt, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType, userId } = req.body;

    // ✅ AUTH & VALIDATION
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized. Please log in." });
    }
    
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute." });
    }

    const input = template || prompt;
    const requestedCount = imageCount || 2;

    if (!productImage) return res.status(400).json({ success: false, error: "productImage is required" });
    if (!input) return res.status(400).json({ success: false, error: "No template or prompt provided" });

    // ✅ USAGE CHECK & INITIALIZATION
    let usage;
    try {
      const { data } = await supabase
        .from("users_usage")
        .select("*")
        .eq("user_id", userId)
        .single();
      usage = data;
    } catch (e) {
      // Ignored, will be handled below
    }

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    if (!usage) {
      // Upsert Initial Usage Row
      const { data: newUsage, error: upsertErr } = await supabase.from("users_usage").upsert({
        user_id: userId,
        images_used: 0,
        plan_limit: 30,
        reset_date: nextMonth.toISOString()
      }).select().single();
      
      if (upsertErr) {
        console.error("Usage initialization failed:", upsertErr);
        return res.status(500).json({ success: false, error: "Failed to initialize account usage." });
      }
      usage = newUsage;
    }

    // ✅ MONTHLY RESET LOGIC
    if (new Date() > new Date(usage.reset_date)) {
      const { data: resetUsage } = await supabase.from("users_usage").update({
        images_used: 0,
        reset_date: nextMonth.toISOString()
      }).eq("user_id", userId).select().single();
      if (resetUsage) usage = resetUsage;
    }

    // ✅ IMAGE LIMIT VALIDATION
    if (usage.images_used + requestedCount > usage.plan_limit) {
      return res.status(403).json({ success: false, error: "Monthly image limit reached" });
    }

    console.log("📥 REQUEST:", { userId, template: input, status: "processing" });

    // ✅ FAIL-SAFE GENERATION
    let images: string[] = [];
    try {
      images = await generateImageWithFal({
        prompt: input,
        productImage,
        faceImage,
        backgroundImage,
        aspectRatio,
        imageCount,
        customPrompt,
        modelType
      });
    } catch (falErr: any) {
      console.error("Fal API Error:", falErr);
      return res.status(500).json({ success: false, error: "Generation failed" });
    }

    if (!images || images.length === 0) {
      return res.status(500).json({ success: false, error: "No images were returned" });
    }

    // ✅ SUCCESS: INCREMENT USAGE
    await supabase.rpc('increment_images_used', { row_id: userId, amount: requestedCount }).catch(async () => {
       // Fallback if RPC doesn't exist
       await supabase.from("users_usage").update({
         images_used: usage.images_used + requestedCount
       }).eq("user_id", userId);
    });

    // ✅ SAVE GENERATION HISTORY
    await supabase.from("generations").insert({
      user_id: userId,
      template: input,
      image_urls: images
    });

    console.log("✅ SUCCESS:", { user_id: userId, template: input, status: "success" });

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
