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
            toolType: "white_background",
            creditCost: 1, // White BG is 1 credit
            prompt: "A product photo, pure white ecommerce background"
        });

        return standardResponse.success({ image_url: resultUrl });
    } catch (error: any) {
        return standardResponse.error(error);
    }
}
