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
  console.log("🔥 GENERATE HIT");

  return res.status(200).json({
    job_id: "job_" + Date.now(),
    status: "queued"
  });
});

const activeJobs = new Set();

app.get("/api/status/:job_id", (req, res) => {
  const { job_id } = req.params;

  console.log("📡 STATUS HIT:", job_id);

  if (!activeJobs.has(job_id)) {
    activeJobs.add(job_id);
    return res.json({ status: "processing" });
  }

  activeJobs.delete(job_id);
  return res.json({
    status: "completed",
    images: [
      "https://picsum.photos/500?1",
      "https://picsum.photos/500?2",
      "https://picsum.photos/500?3",
      "https://picsum.photos/500?4"
    ]
  });
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
