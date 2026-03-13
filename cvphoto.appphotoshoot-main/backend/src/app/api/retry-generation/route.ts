import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const generation_id = body.generation_id;

        if (!generation_id) {
            return NextResponse.json(
                { success: false, error: "Missing generation_id parameter" },
                { status: 400 }
            );
        }

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        // Fetch generation context
        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generations")
            .select("status, user_id, credits_used, retry_count, max_retries")
            .eq("id", generation_id)
            .single();

        if (jobError || !jobData || jobData.user_id !== user.id) {
            return NextResponse.json({ success: false, error: "Generation not found or access denied" }, { status: 404 });
        }

        if (jobData.status !== "failed") {
            return NextResponse.json({ success: false, error: "Can only retry explicitly failed generations" }, { status: 400 });
        }

        const retryCount = jobData.retry_count || 0;
        const maxRetries = jobData.max_retries || 3;

        // If we hit hard bound globally, reset everything to forcefully allow retries over user intervention
        const boundRetryCount = retryCount >= maxRetries ? 0 : retryCount + 1;

        // Reset the job state
        const { error: updateError } = await supabaseAdmin
            .from("generations")
            .update({
                status: "queued",
                progress: 0,
                retry_count: boundRetryCount
            })
            .eq("id", generation_id);

        if (updateError) {
            logger.error(`Manual retry reset failed for job ${generation_id}`, { error: updateError });
            throw new Error("Failed to reset database parameters");
        }

        console.log("[GENERATION]", generation_id, "manual-retry-queued");

        return NextResponse.json({
            success: true,
            generation_id: generation_id,
            status: "queued",
            progress: 0
        });

    } catch (error: any) {
        logger.error("POST generation retry crash", { error: error.message });
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
