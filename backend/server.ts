import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

if (!process.env.FAL_KEY || process.env.FAL_KEY.length < 10) {
  console.error("FAL_KEY missing or invalid");
  throw new Error("FAL_KEY missing");
}

fal.config({
  credentials: process.env.FAL_KEY,
});

const app = express();

app.use(cors({
  origin: [
    "https://product-photoshoot-ai-nu.vercel.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
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

// ✅ USAGE & PLAN INFO ROUTE
app.get("/api/me", async (req, res) => {
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
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKey = firstDayOfMonth.toISOString().split("T")[0];

    const { data } = await supabase
      .from('monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let used = data?.usage_count || 0;
    
    // Auto-reset if month changed
    let shouldReset = false;
    if (data && data.last_reset_date) {
      const lastReset = new Date(data.last_reset_date);
      if (
        lastReset.getMonth() !== now.getMonth() ||
        lastReset.getFullYear() !== now.getFullYear()
      ) {
        shouldReset = true;
      }
    }

    if (shouldReset) {
      await supabase
        .from('monthly_usage')
        .update({ usage_count: 0, last_reset_date: monthKey })
        .eq('user_id', user.id);
      used = 0;
    } else if (!data) {
      await supabase
        .from('monthly_usage')
        .insert({ user_id: user.id, usage_count: 0, last_reset_date: monthKey });
    }

    return res.json({ 
      plan: "Free", 
      used: used, 
      limit: 10, 
      reset_date: monthKey 
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ✅ SIMPLE RATE LIMIT CACHE FOR COOLDOWN
const cooldownCache: Record<string, number> = {};

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

    // ✅ 1. IDEMPOTENCY (PREVENT DOUBLE CHARGES)
    const idempotencyKey = req.headers['x-idempotency-key'];
    if (idempotencyKey) {
      const { data: existingReq } = await supabase
        .from("generation_requests")
        .select("response")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingReq && existingReq.response) {
        return res.json(existingReq.response);
      }
    }

    // ✅ RATE LIMIT (ANTI-ABUSE: 1 req / 5 sec per user)
    if (cooldownCache[user.id] && Date.now() - cooldownCache[user.id] < 5000) {
      return res.status(429).json({ error: "Too many requests" });
    }
    cooldownCache[user.id] = Date.now();

    // ✅ 1. STRICT SERVER CONTROL
    const { prompt, imageUrl, model, imageCount } = req.body;

    // ✅ 4. INPUT VALIDATION
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: "Invalid prompt" });
    }
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    // Optional safety
    if (!imageUrl.includes("supabase")) {
      console.warn("⚠️ Non-supabase image used:", imageUrl);
    }

    // ✅ 2. ATOMIC USAGE CHECK + INCREMENT (CRITICAL)
    const LIMIT = 10;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKey = firstDayOfMonth.toISOString().split("T")[0];

    const { data: allowed, error: rpcError } = await supabase.rpc('check_and_increment_usage', {
      p_user_id: user.id,
      p_limit: LIMIT,
      p_month_key: monthKey
    });

    if (rpcError || !allowed) {
      if (rpcError) console.error("GEN_ERROR", rpcError.message);
      return res.status(403).json({ error: "Monthly limit reached" });
    }

    // ✅ FUTURE READY STRUCTURE
    // if (user.plan === "pro") {
    //   quality = "high";
    //   num_images = 2;
    // }

    let MODEL_ID = "";

    if (model === "gpt") {
      MODEL_ID = "openai/gpt-image-2/edit";   // ✅ correct (NO fal-ai/)
    } else {
      MODEL_ID = "fal-ai/bytedance/seedream/v4.5/edit"; // ✅ correct
    }

    let input: any = {
      prompt: prompt.trim(),
      image_urls: [imageUrl],
      image_size: "square_hd",     // fixed 1024x1024
      num_images: Math.min(imageCount || 1, 4)
    };

    if (model === "gpt") {
      input.quality = "medium";   // required for GPT
    }

    // ✅ 5. LOGGING (PRODUCTION VISIBILITY)
    console.log("GEN_REQUEST:", { userId: user.id, model, imageCount });
    console.log("IMAGE_URL:", imageUrl);
    console.log("MODEL_ID:", MODEL_ID);

    // ✅ 4. SAFE API CALL WITH RETRY
    let result: any;
    let generatedImages: string[] = [];
    let attempt = 1;
    
    try {
      while (attempt <= 2) {
        try {
          result = await Promise.race([
            fal.subscribe(MODEL_ID, { input }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("timeout")), 20000)
            )
          ]);

          const images = result?.data?.images || result?.images || [];

          if (!images || images.length === 0) {
            console.error("FAL RAW RESPONSE:", JSON.stringify(result));
            throw new Error("No images returned");
          }

          generatedImages = images.map((img: any) => img.url);
          
          break;
        } catch (err: any) {
          const isRetryable =
            err.message.includes("timeout") ||
            err.message.includes("network");

          if (!isRetryable || attempt === 2) {
            throw err;
          }

          attempt++;
        }
      }
    } catch (err: any) {
      // ✅ 5. LOGGING ON ERROR
      console.error("GEN_ERROR:", err.message);
      // Rollback atomic increment
      await supabase.rpc('decrement_monthly_usage', { p_user_id: user.id });
      return res.status(500).json({ error: "Image generation failed" });
    }

    // ✅ 6. STORE RESULT + IDEMPOTENCY RESPONSE
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    const imageInserts = generatedImages.map(url => ({
      user_id: user.id,
      image_url: url,
      expires_at: expiresAt.toISOString()
    }));

    const { error: imgError } = await supabase
      .from("generated_images")
      .insert(imageInserts);
    if (imgError) console.error("❌ IMAGE SAVE FAILED:", imgError);

    const finalResponse = { 
      success: true, 
      images: generatedImages 
    };

    if (idempotencyKey) {
      const { error: idempErr } = await supabase
        .from("generation_requests")
        .insert({
          user_id: user.id,
          idempotency_key: idempotencyKey,
          response: finalResponse
        });
      if (idempErr) console.error("❌ IDEMPOTENCY SAVE FAILED:", idempErr);
    }

    console.log(`✅ User ${user.id} successfully generated image.`);

    // ✅ 8. FINAL RESPONSE
    return res.json(finalResponse);

  } catch (err: any) {
    // ✅ 8. ERROR HANDLING
    console.error("❌ GENERATE ERROR:", err);
    return res.status(500).json({
      error: "Image generation failed"
    });
  }
});

// ✅ ASSETS LIBRARY ROUTE
app.get("/api/images", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Missing authorization" });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

    const now = new Date().toISOString();

    // 1. Auto cleanup expired images
    await supabase
      .from("generated_images")
      .delete()
      .eq("user_id", user.id)
      .lt("expires_at", now);

    // 2. Fetch active images
    const { data, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", now)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ images: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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
