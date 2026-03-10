import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageUrl, tool } = body;

        if (!imageUrl || !tool) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Map tools to fetchers
        const fetchers: any = {};
        if (tool === 'remove_bg') fetchers.remove_background = true;
        if (tool === 'upscale') fetchers.super_resolution = true;

        const payload = {
            fetchers,
            image_count: 1, // Only returning 1 image
            credits_cost: tool === 'upscale' ? 2 : 1
        };

        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generation_jobs")
            .insert({
                user_id: user.id,
                input_image: imageUrl,
                template: JSON.stringify(payload),
                status: "pending"
            })
            .select("id")
            .single();

        if (jobError || !jobData) {
            console.error("Failed to enqueue image tool job", jobError);
            return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            job_id: jobData.id,
        });
    } catch (error: any) {
        console.error("Image Tools API Error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
