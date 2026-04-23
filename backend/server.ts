console.log("🚀 CORRECT SERVER FILE IS RUNNING");
import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ROOT ROUTE (optional but useful)
app.get("/", (req, res) => {
  res.send("API is running...");
});

import { generateImageWithFal } from "./src/services/falProcessor";

// Mock user usage tracking (Replace with DB later)
const mockUserUsage: Record<string, number> = {};
const IMAGE_LIMIT = 30;

// ✅ MAIN ROUTE
app.post("/api/generate", async (req, res) => {
  try {
    const { template, prompt, productImage, faceImage, backgroundImage, aspectRatio, imageCount, customPrompt, modelType, userId } = req.body;

    const input = template || prompt;
    const requestedCount = imageCount || 2;
    const uid = userId || "anonymous_user";

    // ✅ IMAGE LIMIT VALIDATION (MOCK)
    const currentUsage = mockUserUsage[uid] || 0;
    if (currentUsage + requestedCount > IMAGE_LIMIT) {
      return res.status(403).json({
        success: false,
        error: "Monthly image limit reached"
      });
    }

    // ✅ VALIDATION
    if (!productImage) {
      return res.status(400).json({
        success: false,
        error: "productImage is required"
      });
    }

    if (!input) {
      return res.status(400).json({
        success: false,
        error: "No template or prompt provided"
      });
    }

    console.log("📥 REQUEST:", { input, hasProductImage: !!productImage, aspectRatio, imageCount, modelType });

    const images = await generateImageWithFal({
      prompt: input, // We pass input as prompt, falProcessor will handle mapping
      productImage,
      faceImage,
      backgroundImage,
      aspectRatio,
      imageCount,
      customPrompt,
      modelType
    });

    // ✅ INCREMENT USAGE AFTER SUCCESS
    if (images && images.length > 0) {
      mockUserUsage[uid] = currentUsage + requestedCount;
    }

    return res.json({
      success: true,
      images
    });

  } catch (err: any) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Generation failed"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
