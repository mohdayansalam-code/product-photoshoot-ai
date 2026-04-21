import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// 1. Fix CORS fully
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2. Add OPTIONS handler for preflight
app.options("*", cors());

// 3. Ensure JSON parsing works
app.use(express.json({ limit: "50mb" }));

// 4. GET / health check
app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend is live!" });
});

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
    console.error("Error in POST /api/generate:", error);
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
    console.error("Error in GET /api/generate/:id :", error);
    res.status(500).json({ error: "Polling failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
