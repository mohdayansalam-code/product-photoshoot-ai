import express from "express";
import { supabase } from "../lib/db.js";
import { generateImage } from "../services/astria.js";
import { modelSelector } from "../utils/modelSelector.js";
import { getOrCreateUser, deductCredits } from "../utils/credits.js";

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

    // DEDUCT CREDITS BEFORE GENERATION
    const requiredCredits = multi_angle ? 4 : 1;
    const user = await getOrCreateUser(user_id);
    const success = await deductCredits(user_id, requiredCredits);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: "Not enough credits"
      });
    }

    // LOG TRANSACTION
    await supabase.from("credit_transactions").insert({
      user_id,
      type: "usage",
      amount: -requiredCredits
    });

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
            prompt: finalPrompt,
            status: "processing",
            astria_request_id
          });

        if (dbError) {
          console.error(`Failed to insert into DB for angle [${config.label}]:`, dbError);
        }
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
