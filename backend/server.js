import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";

import faceModelsRouter from "./routes/face-models.js";
import generateRouter from "./routes/generate.js";
import generationsRouter from "./routes/generations.js";
import generationRouter from "./routes/generation.js";
import adminRouter from "./routes/admin.js";

import { supabase } from "./lib/db.js";

const PORT = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || "0.0.0.0";

async function startServer() {
  const app = express();

  app.use(cors({
    origin: "*"
  }));

  app.use(express.json({ limit: "50mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Pure Express Routes
  app.use("/api/face-models", faceModelsRouter);
  app.use("/api/generate", generateRouter);
  app.use("/api/generations", generationsRouter);
  app.use("/api/generation", generationRouter);
  app.use("/api/admin", adminRouter);

  // Missing APIs for dashboard mock

  app.get("/api/products", (req, res) => {
    res.json([]);
  });

  // Prevent any text/html fallback
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ success: false, error: "Not Found" });
    }
    next();
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err);
    res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  });

  createServer(app).listen(PORT, hostname, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
