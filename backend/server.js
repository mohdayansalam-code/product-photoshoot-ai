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

// ✅ MAIN ROUTE (THIS IS YOUR FIX)
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, image } = req.body;

    const response = await fetch("https://api.astria.ai/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt,
        input_image: image,
        num_images: 4
      })
    });

    const data = await response.json();

    console.log("🔥 ASTRIA GENERATE:", data);

    return res.json({
      job_id: data.id || data.job_id,
      status: "queued"
    });

  } catch (err) {
    console.error("❌ GENERATE ERROR:", err);
    res.status(500).json({ error: "Generation failed" });
  }
});

app.get("/api/status/:job_id", async (req, res) => {
  try {
    const { job_id } = req.params;

    const response = await fetch(`https://api.astria.ai/generate/${job_id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`
      }
    });

    const data = await response.json();

    console.log("📡 ASTRIA STATUS:", data);

    // Adjust based on Astria response
    if (data.status === "completed" || data.images) {
      return res.json({
        status: "completed",
        images: data.images || data.output || []
      });
    }

    return res.json({ status: "processing" });

  } catch (err) {
    console.error("❌ STATUS ERROR:", err);
    res.status(500).json({ error: "Status failed" });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
