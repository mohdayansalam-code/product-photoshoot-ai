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
            .from("generations")
            .select("status, progress, generated_images, user_id, created_at")
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

        const { status, progress, generated_images, created_at } = jobData;

        if (status === "completed") {
            return NextResponse.json({
                generation_id: job_id,
                status: "completed",
                progress: 100,
                image_urls: generated_images || [],
                created_at
            });
        }

        if (status === "failed") {
            return NextResponse.json({
                generation_id: job_id,
                status: "failed",
                progress: progress || 0,
                created_at
            });
        }

        // Return exact progressive status (queued, processing, generating, enhancing)
        return NextResponse.json({
            generation_id: job_id,
            status: status || "processing",
            progress: progress || 0,
            created_at
        });

    } catch (error: any) {
        console.error("Results API error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch job status" },
            { status: 500 }
        );
    }
}
