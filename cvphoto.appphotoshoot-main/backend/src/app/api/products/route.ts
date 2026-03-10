import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";

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

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFilename = `${user.id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        // Convert file to buffer for Supabase upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from("product-images")
            .upload(uniqueFilename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Supabase Upload Error:", uploadError);
            return NextResponse.json(
                { error: "Failed to upload image to storage" },
                { status: 500 }
            );
        }

        // Get Public URL
        const {
            data: { publicUrl },
        } = supabaseAdmin.storage.from("product-images").getPublicUrl(uniqueFilename);

        // Insert into products table
        const { data: productData, error: productError } = await supabaseAdmin
            .from("products")
            .insert({
                user_id: user.id,
                image_url: publicUrl,
                name: name
            })
            .select()
            .single();

        if (productError) {
            console.error("Products Insert Error:", productError);
            return NextResponse.json(
                { error: "Failed to save product record" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            imageUrl: publicUrl,
            product: productData,
        });
    } catch (error) {
        console.error("Upload API Error:", error);
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
