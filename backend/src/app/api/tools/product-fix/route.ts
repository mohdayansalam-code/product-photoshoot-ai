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
            toolType: "product_fix",
            creditCost: 3, // Product Fix is +3 cost
            prompt: "Enhance product label clarity and packaging details without changing branding. Fix product label distortions, correct packaging defects, improve text clarity, high quality."
        });

        return standardResponse.success({ image_url: resultUrl });
    } catch (error: any) {
        return standardResponse.error(error);
    }
}
