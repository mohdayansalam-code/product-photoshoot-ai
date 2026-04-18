import express from "express";
import { createClient } from "@supabase/supabase-js";

function getDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing config");
  return createClient(supabaseUrl, serviceRoleKey);
}

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const supabase = getDatabase();
    const userId = "test-user-123";

    let { data: credits } = await supabase
      .from("credits")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!credits) {
      const { data, error } = await supabase
        .from("credits")
        .insert({
          user_id: userId,
          credits_remaining: 10,
          credits_used: 0,
          credits_purchased: 10
        })
        .select()
        .single();
        
      if (error) {
        console.error("Supabase insert error:", error);
        return res.json({
          user_id: userId,
          credits_remaining: 10,
          credits_used: 0,
          credits_purchased: 10
        });
      }

      return res.json(data);
    }

    return res.json(credits);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load credits" });
  }
});

export default router;
