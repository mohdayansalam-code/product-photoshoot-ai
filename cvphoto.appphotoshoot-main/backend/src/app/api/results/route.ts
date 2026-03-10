import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const job_id = searchParams.get("job_id") || searchParams.get("generation_id");

        if (!job_id) {
            return NextResponse.json(
                { success: false, error: "Missing generation_id parameter" },
                { status: 400 }
            );
        }

        // Authenticate the user
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = user.id;

        // Use admin client to query to bypass RLS locally but we enforce user_id explicitly
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generation_jobs")
            .select("status, result_images, user_id, template")
            .eq("id", job_id)
            .eq("user_id", userId) // explicitly secure access
            .single();

        if (jobError || !jobData) {
            console.error("Error fetching job status or unauthorized:", jobError);
            return NextResponse.json(
                { success: false, error: "Job not found or access denied" },
                { status: 404 }
            );
        }

        const { status, result_images, template } = jobData;

        let payload: any = {};
        if (template && template.startsWith("{")) {
            try {
                payload = JSON.parse(template);
            } catch (e) {
                // Ignore errors, falling back
            }
        }

        if (status === "pending" || status === "running" || status === "processing") {
            return NextResponse.json({
                status: "processing"
            });
        }

        if (status === "completed") {
            return NextResponse.json({
                status: "completed",
                images: result_images || [],
                image_count: payload.image_count || 4,
                scene: payload.scene_prompt || template,
                model: payload.model || "seedream-4.5",
                resolution: payload.resolution || "2k",
                seed: payload.seed,
                product_lock: payload.product_lock !== undefined ? payload.product_lock : true,
                fetchers: payload.fetchers || {}
            });
        }

        if (status === "failed") {
            return NextResponse.json({
                status: "failed"
            });
        }

        // Default fallback
        return NextResponse.json({
            status: "processing"
        });

    } catch (error: any) {
        console.error("Results API error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch job status" },
            { status: 500 }
        );
    }
}
