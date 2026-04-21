import express from "express";
const app = express();

app.use(express.json());

app.post("/api/generate", async (req, res) => {
  console.log("HIT /api/generate");

  return res.json({
    job_id: "job_" + Date.now(),
    status: "queued"
  });
});

app.listen(10000, () => {
  console.log("Server running on 10000");
});
