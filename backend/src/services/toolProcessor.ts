import { createClient } from "@supabase/supabase-js";
import { config } from "@/config/env";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/utils/logger";
import { creditSystem } from "@/services/creditSystem";

type ProcessToolParams = {
  userId: string;
  imageUrl: string;
  toolType: string;
  creditCost: number;
  prompt: string;
};

export const processTool = async ({ userId, imageUrl, toolType, creditCost, prompt }: ProcessToolParams) => {
  const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  
  let status: 'processing' | 'completed' | 'failed' = 'processing';
  const ASTRIA_API_KEY = config.astria.apiKey;
  
  try {
    // 1. Check Credits First
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      status = 'failed';
      throw new ApiError(500, "Could not fetch user credits.");
    }

    if (userData.credits < creditCost) {
      status = 'failed';
      throw new ApiError(402, "Not enough credits.", "PAYMENT_REQUIRED");
    }

    // 2. Deduct Credits
    await creditSystem.deductCredits(supabaseAdmin, userId, creditCost, "image_tools");

    // 3. Process with timeout protection
    let resultUrl: string | undefined;

    const astriaCall = async () => {
      if (!ASTRIA_API_KEY || ASTRIA_API_KEY === "") {
        // Mock success if no API key
        await new Promise(r => setTimeout(r, 1500));
        return imageUrl;
      }

      const astriaEndpoint = `https://api.astria.ai/tunes/690204/prompts`;
      const response = await fetch(astriaEndpoint, {
          method: "POST",
          headers: {
              "Authorization": `Bearer ${ASTRIA_API_KEY}`,
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              prompt: {
                  text: prompt,
                  image_url: imageUrl,
                  num_images: 1,
                  model: "seedream-4.5" // use constant generic model for tools for now
              }
          }),
      });

      if (!response.ok) {
          const errLog = await response.text();
          throw new Error(`Astria API failed: ${errLog}`);
      }

      const astriaData = await response.json() as any;
      return astriaData?.images?.[0];
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout processing tool (5 minutes exceeded).")), 300000); // 5 min
    });

    resultUrl = await Promise.race([astriaCall(), timeoutPromise]);

    if (!resultUrl) {
       throw new Error("No image generated from tool.");
    }

    // Capture Result Image and Save to Storage
    const imgRes = await fetch(resultUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${userId}/${Date.now()}_${toolType}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
        .from("generated-images")
        .upload(`generated/${fileName}`, buffer, {
            contentType: "image/png",
            upsert: true,
        });

    if (uploadError) {
        throw new Error("Failed to upload result to storage: " + uploadError.message);
    }

    const { data: urlData } = supabaseAdmin.storage
        .from("generated-images")
        .getPublicUrl(`generated/${fileName}`);

    const finalStorageUrl = urlData.publicUrl;

    // 4. Save explicit entry into Assets Table
    const { error: assetError } = await supabaseAdmin.from('assets').insert({
        user_id: userId,
        image_url: finalStorageUrl,
        source: toolType,
        created_at: new Date().toISOString()
    });

    if (assetError) {
        logger.error(`Failed to insert asset for ${userId}: ${assetError.message}`);
        // Consider this a soft fail, the image is still generated and accessible
    }

    status = 'completed';
    return finalStorageUrl;

  } catch (error: any) {
    status = 'failed';
    // If it fails after checking credits, it likely deducted (if it didn't throw in deduct process)
    // Refund the credits explicitly as requested
    if (error.status !== 402 && error.message !== "Not enough credits.") {
       // Using existing refund logic if deduct was initiated
       await supabaseAdmin.rpc("refund_credits", { p_user_id: userId, p_amount: creditCost })
          .then(({ error: refundError }) => { 
             if (refundError) logger.error(refundError.message) 
          });
    }
    
    logger.error(`ToolProcessor [${toolType}] failed for ${userId}`, { error: error.message });
    throw error;
  }
};
