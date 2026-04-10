import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "No token provided", "UNAUTHORIZED");

        const supabaseAuth = createClient(config.supabase.url, config.supabase.serviceRoleKey);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
        }

        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

        let { data: creditsData } = await supabaseAdmin
            .from("credits")
            .select("credits_remaining")
            .eq("user_id", user.id)
            .single();
            
        if (!creditsData) {
            await supabaseAdmin.from("credits").insert({
                user_id: user.id,
                credits_remaining: 100
            });
            creditsData = { credits_remaining: 100 };
        }
        
        const credits = creditsData?.credits_remaining || 0;

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

        const totalSizeInMB = images_generated * 1.8;
        const totalSizeInGB = totalSizeInMB / 1024;
        
        let storage_used = "0 MB";
        if (totalSizeInGB >= 1) {
            storage_used = `${totalSizeInGB.toFixed(1)} GB`;
        } else if (totalSizeInMB > 0) {
            storage_used = `${Math.ceil(totalSizeInMB)} MB`;
        }

        return standardResponse.success({
            stats: { credits, images_generated, active_projects, storage_used }
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
