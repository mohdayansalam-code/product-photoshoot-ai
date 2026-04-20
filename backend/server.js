import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" })); // Kept 50mb limit for large images

app.post("/api/generate", async (req, res) => {
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

app.get("/api/generate/:id", async (req, res) => {
  try {
    const response = await fetch(`https://api.astria.ai/generate/${req.params.id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.ASTRIA_API_KEY}`
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Polling failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
