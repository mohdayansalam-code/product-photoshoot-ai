import express from "express";
import { supabase } from "../lib/db.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  const email = req.headers['x-admin-email'];
  
  const allowedAdmins = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  
  if (process.env.ADMIN_SECRET && secret !== process.env.ADMIN_SECRET) {
     if (allowedAdmins.length === 0 || !allowedAdmins.includes(email)) {
        return res.status(403).json({ success: false, error: "Unauthorized Identity" });
     }
  }

  try {
    const { count: totalGenerations } = await supabase.from("generations").select("*", { count: 'exact', head: true });
    
    // Total Credits Burned (Assuming status = completed equates to 1 credit per image)
    const { count: creditsUsed } = await supabase.from("generations").select("*", { count: 'exact', head: true }).eq('status', 'completed');
    
    const { count: totalFailures } = await supabase.from("generations").select("*", { count: 'exact', head: true }).in('status', ['failed_generation', 'failed_billing']);
    
    // Top 50 generic errors from logs table
    const { data: recentErrors } = await supabase
      .from("logs")
      .select("*")
      .in('event', ['generation_failure', 'credit_failed'])
      .order('timestamp', { ascending: false })
      .limit(50);
      
    return res.json({
      success: true,
      data: {
         totalGenerations: totalGenerations || 0,
         totalFailures: totalFailures || 0,
         creditsUsed: creditsUsed || 0,
         recentErrors: recentErrors || []
      }
    });
  } catch (error) {
    console.error("Admin stats failed", error);
    res.status(500).json({ success: false, error: "Stats failure" });
  }
});

export default router;
