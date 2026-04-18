import { NextRequest } from "next/server";
import { standardResponse, ApiError } from "@/lib/apiError";
import { creditSystem } from "@/services/creditSystem";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function GET(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const creditsData = await creditSystem.getOrCreateCredits(supabaseAdmin, user.id);
        const credits = creditsData.credits_remaining || 0;

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
