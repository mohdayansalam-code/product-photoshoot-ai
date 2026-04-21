console.log("🚀 CORRECT SERVER FILE IS RUNNING");
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// ✅ ROOT ROUTE (optional but useful)
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ MAIN ROUTE (THIS IS YOUR FIX)
app.post("/api/generate", (req, res) => {
  console.log("🔥 HIT /api/generate");

  return res.status(200).json({
    job_id: "job_" + Date.now(),
    status: "queued"
  });
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
