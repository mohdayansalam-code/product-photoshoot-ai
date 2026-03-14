import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createAdminClient(supabaseUrl, supabaseKey);

        // 1. Get Credits
        const { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();
        
        const credits = creditsData?.credits_remaining || 0;

        // 2. Get Generations (Active Projects) and Images Generated
        const { data: generations } = await supabaseAdmin
            .from("generations")
            .select("status, image_count")
            .eq("user_id", user.id);

        let active_projects = 0;
        let images_generated = 0;

        if (generations) {
            active_projects = generations.length;
            images_generated = generations
                .filter(gen => gen.status === "completed")
                .reduce((sum, gen) => sum + (gen.image_count || 0), 0);
        }

        // 3. Estimate Storage (Approx 1.8 MB per completed high-res image)
        const totalSizeInMB = images_generated * 1.8;
        const totalSizeInGB = totalSizeInMB / 1024;
        
        let storage_used = "0 MB";
        if (totalSizeInGB >= 1) {
            storage_used = `${totalSizeInGB.toFixed(1)} GB`;
        } else if (totalSizeInMB > 0) {
            storage_used = `${Math.ceil(totalSizeInMB)} MB`;
        }

        return NextResponse.json({
            success: true,
            stats: {
                credits,
                images_generated,
                active_projects,
                storage_used
            }
        });

    } catch (error: any) {
        console.error("Dashboard Stats API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
