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

    // ✅ VALIDATION (prevents 500 crash)
    if (!image) {
      return res.status(400).json({
        error: "Image is required"
      });
    }

    console.log("📥 REQUEST:", { prompt, image });

    const response = await fetch("https://api.astria.ai/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.ASTRIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        input_image: image,
        num_images: 4
      })
    });

    const data = await response.json();

    console.log("🔥 ASTRIA RESPONSE:", data);

    // ✅ SAFE EXTRACTION
    const jobId =
      data?.id ||
      data?.job_id ||
      data?.task_id ||
      data?.prediction_id;

    if (!jobId) {
      console.error("❌ NO JOB ID:", data);
      return res.status(500).json({
        error: "No job_id returned",
        raw: data
      });
    }

    return res.json({
      job_id: jobId,
      status: "queued"
    });

  } catch (err) {
    console.error("❌ SERVER ERROR:", err);
    return res.status(500).json({
      error: "Server crashed"
    });
  }
});

app.get("/api/status/:job_id", async (req, res) => {
  try {
    const { job_id } = req.params;

    const response = await fetch(
      `https://api.astria.ai/status/${job_id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ASTRIA_API_KEY}`
        }
      }
    );

    const data = await response.json();

    console.log("📡 STATUS:", data);

    const images =
      data?.images ||
      data?.output ||
      data?.result?.images ||
      [];

    if (data.status === "completed") {
      return res.json({
        status: "completed",
        images
      });
    }

    return res.json({
      status: data.status || "processing"
    });

  } catch (err) {
    console.error("❌ STATUS ERROR:", err);
    return res.status(500).json({
      error: "Status failed"
    });
  }
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
