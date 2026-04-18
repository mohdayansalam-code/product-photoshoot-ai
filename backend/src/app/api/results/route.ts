import { NextRequest } from "next/server";
import { standardResponse, ApiError } from "@/lib/apiError";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const job_id = searchParams.get("job_id") || searchParams.get("generation_id");

        if (!job_id) {
            throw new ApiError(400, "Missing generation_id parameter");
        }

        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const { data: jobData, error: jobError } = await supabaseAdmin
            .from("generations")
            .select("status, progress, generated_images, user_id, created_at")
            .eq("id", job_id)
            .eq("user_id", user.id) // explicitly secure access
            .single();

        if (jobError || !jobData) {
            throw new ApiError(404, "Job not found or access denied", "NOT_FOUND");
        }

        const { status, progress, generated_images, created_at } = jobData;

        if (status === "completed") {
            return standardResponse.success({
                generation_id: job_id,
                status: "completed",
                progress: 100,
                image_urls: generated_images || [],
                created_at
            });
        }

        if (status === "failed") {
            return standardResponse.success({
                generation_id: job_id,
                status: "failed",
                progress: progress || 0,
                created_at
            });
        }

        return standardResponse.success({
            generation_id: job_id,
            status: status || "processing",
            progress: progress || 0,
            created_at
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
