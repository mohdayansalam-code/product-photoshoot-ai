import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function POST(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        let name = formData.get("name") as string | null;

        if (!file) {
            return standardResponse.error(new ApiError(400, "No file provided", "BAD_REQUEST"), "No file provided");
        }

        if (!name) {
            name = file.name;
        }

        // Generate placeholder Product row first to fetch Product ID
        const { data: placeholder, error: insertError } = await supabaseAdmin
            .from("products")
            .insert({ user_id: user.id, name: name, image_url: "" })
            .select("id")
            .single();

        if (insertError || !placeholder) {
            logger.error("Failed to generate Product ID placeholder", { error: insertError });
            return standardResponse.error(new ApiError(500, "Failed to allocate product ID", "DB_ERROR"));
        }

        const productId = placeholder.id;
        const targetFilename = `products/${user.id}/${productId}.png`;

        // Convert file to buffer for Supabase upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from("product-images")
            .upload(targetFilename, buffer, {
                contentType: file.type || "image/png",
                upsert: true,
            });

        if (uploadError) {
            logger.error("Supabase Upload Error", { error: uploadError });
            // Cleanup placeholder
            await supabaseAdmin.from("products").delete().eq("id", productId);
            return standardResponse.error(new ApiError(500, "Failed to upload image to storage", "UPLOAD_ERROR"));
        }

        // Get Public URL
        const {
            data: { publicUrl },
        } = supabaseAdmin.storage.from("product-images").getPublicUrl(targetFilename);

        // Update exact product row with the final publicUrl 
        const { data: productData, error: productError } = await supabaseAdmin
            .from("products")
            .update({ image_url: publicUrl })
            .eq("id", productId)
            .select()
            .single();

        if (productError) {
            logger.error("Products Update Error", { error: productError });
            return standardResponse.error(new ApiError(500, "Failed to update product record", "DB_ERROR"));
        }

        return standardResponse.success({
            imageUrl: publicUrl,
            product: productData,
        });
    } catch (error: any) {
        logger.error("Upload API Error", { error: error.message });
        return standardResponse.error(error);
    }
}

export async function GET(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const { data: products, error } = await supabaseAdmin
            .from("products")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch Products Error:", error);
            return standardResponse.error(new ApiError(500, "Failed to fetch products", "DB_ERROR"));
        }

        return standardResponse.success({
            products: products || [],
        });
    } catch (error: any) {
        return standardResponse.error(error);
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const url = new URL(req.url);
        const productId = url.searchParams.get("id");

        if (!productId) {
            return standardResponse.error(new ApiError(400, "Missing product ID", "BAD_REQUEST"));
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("id", productId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !existing) {
             return standardResponse.error(new ApiError(404, "Product not found or unauthorized", "NOT_FOUND"));
        }

        // 1. Storage Cleanup
        const targetFilename = `products/${user.id}/${productId}.png`;
        const { error: storageError } = await supabaseAdmin.storage
             .from("product-images")
             .remove([targetFilename]);

        if (storageError) {
             logger.error("Failed to delete storage file", { error: storageError, targetFilename });
        }

        // 2. DB Cleanup
        const { error: dbError } = await supabaseAdmin
            .from("products")
            .delete()
            .eq("id", productId)
            .eq("user_id", user.id);

        if (dbError) {
             return standardResponse.error(new ApiError(500, "Failed to delete from database", "DB_ERROR"));
        }

        return standardResponse.success({ deleted: true });

    } catch (error: any) {
         return standardResponse.error(error);
    }
}
