import express from "express";
import { supabase } from "../lib/db.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false });
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
