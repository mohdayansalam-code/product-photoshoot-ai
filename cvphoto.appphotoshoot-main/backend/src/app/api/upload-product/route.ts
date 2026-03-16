import { NextRequest } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";

const MAX_UPLOAD_MB = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const replaceId = formData.get("replaceId") as string;

        if (!file) {
            throw new ApiError(400, "No file uploaded");
        }

        if (file.size > MAX_UPLOAD_MB) {
            throw new ApiError(413, "File exceeds 5MB size limit. Please compress and try again.");
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new ApiError(415, "Invalid file format. Only JPEG, PNG, and WEBP are allowed.");
        }

        const supabase = createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createAdminClient(config.supabase.url, config.supabase.serviceRoleKey);
        
        await rateLimiter.checkLimit(supabaseAdmin, user.id, 20, 60000, "upload_product");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from("product-images")
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            logger.error("Upload failed", { error: uploadError });
            throw new ApiError(500, "Failed to upload image to storage");
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("product-images")
            .getPublicUrl(fileName);

        if (replaceId) {
            await supabaseAdmin.from("products").update({ image_url: publicUrl }).eq("id", replaceId).eq("user_id", user.id);
            logger.info("Replaced product image", { productId: replaceId, userId: user.id });
            return standardResponse.success({ imageUrl: publicUrl, productId: replaceId });
        }

        const { data: productData, error: dbError } = await supabaseAdmin
            .from("products")
            .insert({
                user_id: user.id,
                name: file.name,
                image_url: publicUrl,
            })
            .select("id")
            .single();

        if (dbError) {
             logger.error("Upload DB hook failed", { error: dbError });
             throw new ApiError(500, "Image stored, but failed to link to database");
        }

        logger.info("New product uploaded", { productId: productData.id, userId: user.id });

        return standardResponse.success({
            imageUrl: publicUrl,
            productId: productData.id,
        });

    } catch (error: any) {
         return standardResponse.error(error);
    }
}
