import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch generation history ordered descending
        const { data: generations, error } = await supabaseAdmin
            .from("generations")
            .select("id, image_url, prompt, model, generated_images, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error("Failed to fetch generations history", { error: error.message });
            return NextResponse.json({ success: false, error: "Failed to fetch history" }, { status: 500 });
        }

        // Map payload exactly to user requirements
        const mappedHistory = generations.map(job => ({
            id: job.id,
            product_image: job.image_url,
            prompt: job.prompt,
            model: job.model,
            image_urls: job.generated_images || [],
            created_at: job.created_at
        }));

        return NextResponse.json(mappedHistory);

    } catch (error: any) {
        logger.error("GET generations router crash", { error: error.message });
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
