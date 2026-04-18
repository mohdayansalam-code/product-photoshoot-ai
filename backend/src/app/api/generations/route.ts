import { NextRequest } from "next/server";
import { standardResponse, ApiError } from "@/lib/apiError";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function GET(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const { data: generations, error } = await supabaseAdmin
            .from("generations")
            .select("id, image_url, prompt, model, generated_images, status, image_count, credits_used, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            throw new ApiError(500, "Failed to fetch history");
        }

        const mappedHistory = generations.map(job => ({
            id: job.id,
            product_image: job.image_url,
            prompt: job.prompt,
            model: job.model,
            status: job.status,
            image_count: job.image_count || job.generated_images?.length || 0,
            credits_used: job.credits_used || 0,
            image_urls: job.generated_images || [],
            created_at: job.created_at
        }));

        return standardResponse.success(mappedHistory);

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
