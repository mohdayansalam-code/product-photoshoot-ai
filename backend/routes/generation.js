import express from "express";
import { getGeneration } from "../services/astria.js";

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing generation id" });
    }

    const astriaResponse = await getGeneration(id);

    if (!astriaResponse.success) {
      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch from Astria",
        details: astriaResponse.error 
      });
    }

    // Extract image url as instructed
    const data = astriaResponse.data;
    const imageUrl = data?.images?.[0]?.url || data?.images?.[0] || null;

    if (!imageUrl) {
      return res.json({ 
        success: true, 
        status: "processing", 
        message: "Image not ready yet" 
      });
    }

    return res.json({
      success: true,
      image_url: imageUrl
    });
  } catch (error) {
    next(error);
  }
});

export default router;
