import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { logger } from "@/utils/logger";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        let name = formData.get("name") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
            return NextResponse.json({ error: "Failed to allocate product ID" }, { status: 500 });
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
            return NextResponse.json(
                { error: "Failed to upload image to storage" },
                { status: 500 }
            );
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
            return NextResponse.json(
                { error: "Failed to update product record" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            product: productData,
        });
    } catch (error: any) {
        logger.error("Upload API Error", { error: error.message });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: products, error } = await supabaseAdmin
            .from("products")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Fetch Products Error:", error);
            return NextResponse.json(
                { error: "Failed to fetch products" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            products: products || [],
        });
    } catch (error) {
        console.error("Products GET API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
