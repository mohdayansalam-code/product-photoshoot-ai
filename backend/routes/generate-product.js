import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { user_prompt } = req.body;

    // STEP 1: Create generation request
    const response = await fetch(
      `https://api.astria.ai/tunes/${process.env.ASTRIA_TUNE_ID}/prompts`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: user_prompt || "luxury product photoshoot",
          num_images: 1
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Astria API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    console.log("ASTRIA SERVER STATUS:", response.status);
    console.log("ASTRIA SERVER DATA:", JSON.stringify(data));

    // STEP 2: Extract image URL (Astria returns directly or inside array)
    const imageUrl =
      data?.images?.[0]?.url ||
      data?.url ||
      "";

    return res.json({
      success: true,
      data: {
        image_url: imageUrl,
        images: [imageUrl],
        status: "completed"
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Astria generation failed"
    });
  }
});

export default router;
