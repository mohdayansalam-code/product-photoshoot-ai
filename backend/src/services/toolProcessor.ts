import { createClient } from "@supabase/supabase-js";
import { config } from "@/config/env";
import { ApiError } from "@/lib/apiError";
import { logger } from "@/utils/logger";
import { generateImageWithFal } from "./falProcessor";

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
  
  try {
    // 3. Process with timeout protection
    let resultUrl: string | undefined;

    const falCall = async () => {
      const urls = await generateImageWithFal({ prompt, productImage: imageUrl });
      if (!urls || urls.length === 0) {
          throw new Error(`Fal API failed to return images`);
      }
      return urls[0];
    };

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout processing tool (5 minutes exceeded).")), 300000); // 5 min
    });

    resultUrl = await Promise.race([falCall(), timeoutPromise]);

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
    logger.error(`ToolProcessor [${toolType}] failed for ${userId}`, { error: error.message });
    throw error;
  }
};
