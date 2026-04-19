import express from "express";
import { getGeneration } from "../services/astria.js";
import { supabase } from "../lib/db.js";
import { logEvent } from "../utils/logger.js";

const router = express.Router();

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Missing generation id" });
    }

    // 3. IDEMPOTENT RETRIES (BACKEND) - Short-circuit if already mapped successfully
    const { data: earlyCheck } = await supabase
      .from('generations')
      .select('status, image_url')
      .eq('astria_request_id', id)
      .single();

    if (earlyCheck && earlyCheck.status === 'completed' && earlyCheck.image_url) {
      return res.json({
        success: true,
        image_url: earlyCheck.image_url,
        status: 'completed'
      });
    }

    const astriaResponse = await getGeneration(id);

    if (!astriaResponse.success) {
      // Free DB Lock globally ensuring robust failures drop safely
      await supabase.from('generations').update({ status: 'failed_generation' }).eq('astria_request_id', id);
      
      const { data: userTrace } = await supabase.from('generations').select('user_id').eq('astria_request_id', id).single();
      logEvent('error', 'generation_failure', userTrace?.user_id || 'unknown', id, { 
        failure_reason: "API error", 
        details: astriaResponse.error 
      });

      return res.status(500).json({ 
        success: false, 
        error: "Failed to fetch from Astria",
        details: astriaResponse.error 
      });
    }

    // Extract image url as instructed
    const data = astriaResponse.data;
    const imageUrl = data?.images?.[0]?.url || data?.images?.[0] || null;

    if (!imageUrl) {
      // BACKEND AUTO TIMEOUT Check (Garbage Collection)
      const { data: genRow } = await supabase
        .from('generations')
        .select('created_at, status')
        .eq('astria_request_id', id)
        .single();
        
      if (genRow && (genRow.status === 'processing' || genRow.status === 'pending')) {
        const creationTime = new Date(genRow.created_at).getTime();
        // Fallback: 5 minutes max backend tolerance
        if (Date.now() - creationTime > 5 * 60 * 1000) { 
           await supabase.from('generations').update({ status: 'failed_generation' }).eq('astria_request_id', id);
           
           logEvent('warning', 'generation_failure', genRow.user_id || 'unknown', id, { 
             failure_reason: "timeout Server limit > 5 min" 
           });

           return res.status(500).json({ success: false, error: "Generation timed out on server layer" });
        }
      }

      return res.json({ 
        success: true, 
        status: "processing", 
        message: "Image not ready yet" 
      });
    }

    // ATOMIC SUCCESS DEDUCTION & COMPLETION
    // Executes entirely within PostgreSQL tracking Idempotency 
    const { data: atomicLock, error } = await supabase.rpc("complete_generation_and_deduct", {
      p_request_id: id,
      p_image_url: imageUrl
    });
    
    if (error || !atomicLock) {
      if (error) console.error("Atomic Lock Error:", error);

      // Determine reason for rejection
      const { data: checkRow } = await supabase
        .from('generations')
        .select('status, user_id')
        .eq('astria_request_id', id)
        .single();
        
      if (checkRow && checkRow.status === 'failed_billing') {
        logEvent('error', 'credit_failed', checkRow.user_id, id, { reason: "Insufficient credits verified during atomic Postgres lock" });
        return res.status(402).json({
          success: false,
          error: "Billing verification failed. Insufficient credits.",
        });
      }

      // Idempotency: If FALSE due to already completed, treat as success safely
      if (checkRow && checkRow.status === 'completed') {
        return res.json({
          success: true,
          image_url: imageUrl
        });
      }

      return res.status(400).json({
        success: false,
        error: "Generation processing blocked securely.",
      });
    }

    // Backend Enforcement: Only return image if properly billed via lock
    
    // Explicit completion traces pushing to both generation and billing maps natively!
    const { data: traceUser } = await supabase.from('generations').select('user_id').eq('astria_request_id', id).single();
    logEvent('info', 'generation_success', traceUser?.user_id || 'unknown', id, { image_url: imageUrl });
    logEvent('info', 'credit_deducted', traceUser?.user_id || 'unknown', id, { amount: -1 });

    return res.json({
      success: true,
      image_url: imageUrl
    });
  } catch (error) {
    next(error);
  }
});

// Explicit manual timeout failure unlock trigger
router.post("/:id/fail", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: "Missing id" });

    // VERIFY BEFORE FAILING
    const { data: genRow } = await supabase
      .from('generations')
      .select('status, image_url, created_at')
      .eq('astria_request_id', id)
      .single();

    if (!genRow) return res.json({ success: false, message: "Not found" });

    const isCompleted = genRow.status === 'completed' || genRow.image_url !== null;
    const isPending = genRow.status === 'processing' || genRow.status === 'pending';
    
    // PREVENT INVALID FAIL (If already completed, ignore natively bypassing frontend limits)
    if (isCompleted) {
       return res.json({ success: true, ignored: true, message: "Already completed" });
    }

    // ONLY FAIL IF genuinely pending AND exceeds safety 2-minute threshold
    const creationTime = new Date(genRow.created_at).getTime();
    if (isPending && (Date.now() - creationTime > 2 * 60 * 1000)) {
       await supabase.from('generations').update({ status: 'failed_generation' }).eq('astria_request_id', id);
       
       logEvent('warning', 'generation_failure', genRow.user_id || 'unknown', id, { failure_reason: "timeout Frontend triggered manual drop > 2 min" });

       return res.json({ success: true, updated: true });
    }

    res.json({ success: true, updated: false, message: "Threshold not met or invalid state" });
  } catch (error) {
    next(error);
  }
});

export default router;
