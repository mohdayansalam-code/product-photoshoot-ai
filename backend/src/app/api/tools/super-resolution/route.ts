import { NextRequest } from "next/server";
import { standardResponse, ApiError } from "@/lib/apiError";
import { processTool } from "@/services/toolProcessor";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function POST(req: NextRequest) {
    try {
        const { user } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) throw new ApiError(400, "Missing required fields");

        const resultUrl = await processTool({
            userId: user.id,
            imageUrl,
            toolType: "super_resolution",
            creditCost: 2, // Super Res is +2 cost
            prompt: "A product photo, high resolution, 4k upscaled detail, crisp"
        });

        return standardResponse.success({ image_url: resultUrl });
    } catch (error: any) {
        return standardResponse.error(error);
    }
}
