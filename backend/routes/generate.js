import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const response = await fetch("https://api.astria.ai/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Generation failed" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const response = await fetch(`https://api.astria.ai/generate/${req.params.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Polling failed" });
  }
});

export default router;
