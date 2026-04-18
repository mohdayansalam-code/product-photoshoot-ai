import express from "express";
import { supabase } from "../lib/db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("face_models")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
