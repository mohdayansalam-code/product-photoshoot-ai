import express from "express";
import { supabase } from "../lib/db.js";
import { generateImage } from "../services/astria.js";
import { modelSelector } from "../utils/modelSelector.js";
import { getOrCreateUser } from "../utils/credits.js";
import { logEvent } from "../utils/logger.js";

const getShootStyle = (type) => {
  switch (type) {
    case "studio":
      return "professional studio lighting, soft shadows, clean background";
    case "outdoor":
      return "natural lighting, outdoor environment, realistic shadows";
    case "luxury":
      return "high-end fashion campaign, glossy lighting, premium background";
    case "ecommerce":
      return "white background, product centered, minimal shadows";
    default:
      return "";
  }
};

const getModelStyle = (model) => {
  switch (model) {
    case "seedream":
      return "ultra realistic, high detail, cinematic lighting";
    case "flux":
      return "sharp, modern, clean composition";
    case "realistic":
      return "photorealistic, natural lighting, high resolution";
    default:
      return "";
  }
};

const getProductPlacementHint = (prompt) => {
  const p = prompt.toLowerCase();
  if (p.includes("sunglass") || p.includes("glasses")) return "sunglasses properly aligned on face";
  if (p.includes("watch")) return "watch correctly worn on wrist";
  if (p.includes("bag") || p.includes("purse")) return "bag held naturally in hand";
  return "";
};

const router = express.Router();

// Local Memory Buffer spanning Rate Limits linearly
const userRateLimits = new Map();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_MS = 60 * 1000;
const DAILY_CAP_MAX = 100; // Hard threshold protecting API wallets safely

router.post("/", async (req, res, next) => {
  try {
    const { user_prompt, product_image, shoot_type, gender, user_id, multi_angle = true } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "user_id is required"
      });
    }

    if (!gender) {
      return res.status(400).json({
        success: false,
        error: "gender is required"
      });
    }

    if (!shoot_type) {
      return res.status(400).json({
        success: false,
        error: "shoot_type is required"
      });
    }

    if (!product_image) {
      return res.status(400).json({
        success: false,
        error: "Product image required"
      });
    }

    // 3. RATE LIMITING (In-Memory Trajectory)
    const now = Date.now();
    const userLimits = userRateLimits.get(user_id) || [];
    const validRequests = userLimits.filter(timestamp => timestamp > now - RATE_LIMIT_MS);
    
    if (validRequests.length >= RATE_LIMIT_MAX) {
       logEvent('warning', 'generation_failure', user_id, null, { reason: "rate_limit_exceeded" });
       return res.status(429).json({ success: false, error: "Rate limit exceeded. Please wait a minute." });
    }
    
    // 4. COST PROTECTION (Daily Cap)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: dailyGenerations } = await supabase
       .from('generations')
       .select('id', { count: 'exact', head: true })
       .eq('user_id', user_id)
       .gte('created_at', startOfDay.toISOString());
       
    if ((dailyGenerations || 0) >= DAILY_CAP_MAX) {
       logEvent('warning', 'generation_failure', user_id, null, { reason: "daily_cap_exceeded" });
       return res.status(429).json({ success: false, error: "Daily generation capacity exceeded to prevent abuse." });
    }
    
    // Commit to buffer globally
    validRequests.push(now);
    userRateLimits.set(user_id, validRequests);

    if (!user_prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required"
      });
    }

    const shoot_style = getShootStyle(shoot_type);
    const { tune_id, trigger_word } = await modelSelector(user_id, gender);
    console.log("User:", user_id);
    console.log("Gender:", gender);
    console.log("Tune ID:", tune_id);
    console.log("Trigger:", trigger_word);

    // CHECK CREDITS (DO NOT DEDUCT YET)
    const requiredCredits = multi_angle ? 4 : 1;
    const user = await getOrCreateUser(user_id);

    if (!user || user.credits < requiredCredits) {
      logEvent('error', 'credit_failed', user_id, null, { reason: "Insufficient credits to start generation" });
      return res.status(400).json({
        success: false,
        error: "Not enough credits to start generation"
      });
    }

    const angleConfigs = multi_angle ? [
      { label: "front", text: "front view, looking at camera" },
      { label: "side", text: "side profile, 90 degree angle" },
      { label: "45deg", text: "45 degree angle, slightly turned" },
      { label: "closeup", text: "close-up shot, product focus" }
    ] : [
      { label: "standard", text: "" }
    ];

    const generationTasks = angleConfigs.map(async (config) => {
      const finalPrompt = `
${trigger_word}
${user_prompt}

${shoot_style}
${config.text}

product clearly visible
focus on product
realistic product placement
correct positioning (e.g. sunglasses on face, watch on wrist)

commercial product photography
e-commerce style
high detail, ultra realistic

avoid blur, avoid distortion, no floating product
`;

      console.log(`Generating angle [${config.label}] with Tune ID: ${tune_id}`);

      const astriaResponse = await generateImage({ prompt: finalPrompt, product_image, tune_id });
      
      let astria_request_id = null;
      if (astriaResponse.success && astriaResponse.data) {
        astria_request_id = astriaResponse.data.id ? String(astriaResponse.data.id) : null;
      }

      // Save strictly to DB as processing tracker
      if (astria_request_id) {
        const { error: dbError } = await supabase
          .from("generations")
          .insert({
            user_id: user_id, // Store for polling deduction
            prompt: finalPrompt,
            status: "processing",
            astria_request_id
          });

        if (dbError) {
          console.error(`Failed to insert into DB for angle [${config.label}]:`, dbError);
        }

        // Trace generation startup exactly once DB is firmly locked
        logEvent('info', 'generation_start', user_id, astria_request_id, { 
          product_type: shoot_type, 
          angle: config.label 
        });
      }

      // Trace initial API failure synchronously
      if (!astriaResponse.success) {
         logEvent('error', 'generation_failure', user_id, null, { 
           failure_reason: "astria_pre_flight_error", 
           details: astriaResponse.error 
         });
      }

      return {
        angle: config.label,
        request_id: astria_request_id,
        success: astriaResponse.success,
        error: astriaResponse.success ? null : astriaResponse.error
      };
    });

    // Option A (Fast Mode): parallel execution
    const results = await Promise.all(generationTasks);
    
    // Check if everything failed
    const failed = results.filter(r => !r.success);
    if (failed.length === results.length && results.length > 0) {
      return res.status(500).json({
        success: false,
        error: "Astria generations failed for all angles",
        details: failed[0].error
      });
    }

    return res.json({
      success: true,
      request_ids: results.map(r => r.request_id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message || "Server error",
    });
  }
});

export default router;
