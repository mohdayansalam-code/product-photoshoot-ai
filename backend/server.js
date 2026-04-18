import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";

import faceModelsRouter from "./routes/face-models.js";
import generateRouter from "./routes/generate.js";
import generationsRouter from "./routes/generations.js";
import generationRouter from "./routes/generation.js";

import { supabase } from "./lib/db.js";
import { getOrCreateUser } from "./utils/credits.js";

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

  // Missing APIs for dashboard mock
  app.get("/api/credits", async (req, res, next) => {
    try {
      // In a real app, extract user_id from JWT token
      const user_id = "demo-user";
      const user = await getOrCreateUser(user_id);
      
      res.json({
        success: true,
        credits: user.credits
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/purchase", async (req, res, next) => {
    try {
      const { user_id = "demo-user", plan } = req.body;
      
      let creditsToAdd = 0;
      if (plan === "starter") creditsToAdd = 100;
      if (plan === "pro") creditsToAdd = 300;
      
      if (creditsToAdd === 0) {
        return res.status(400).json({ success: false, error: "Invalid plan" });
      }

      // Use RPC for safe increment
      const { error: updateError } = await supabase.rpc("increment_credits", {
        p_user_id: user_id,
        p_amount: creditsToAdd
      });
        
      if (updateError) {
        console.error("Increment error:", updateError);
        throw new Error("Failed to update credits");
      }

      // Log Transaction
      await supabase.from("credit_transactions").insert({
        user_id,
        type: "purchase",
        amount: creditsToAdd
      });

      res.json({
        success: true,
        credits_added: creditsToAdd
      });
    } catch (error) {
      next(error);
    }
  });

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
