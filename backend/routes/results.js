import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  const jobId = req.query.generation_id || "mock-gen-123";
  try {
    return res.json({
      success: true,
      data: {
        generation_id: jobId,
        status: "completed",
        images: ["https://via.placeholder.com/512?text=AI+Generated"],
        prompt: "Generated Photoshoot",
        model: "Mock Sandbox Model"
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
