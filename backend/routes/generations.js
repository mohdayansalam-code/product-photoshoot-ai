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
      console.error(error);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    return res.json({
      success: true,
      data: data || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
