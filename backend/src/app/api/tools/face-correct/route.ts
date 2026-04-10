import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { processTool } from "@/services/toolProcessor";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) throw new ApiError(401, "No token provided", "UNAUTHORIZED");

        const supabaseAuth = createClient(config.supabase.url, config.supabase.serviceRoleKey);
        let user;
        const { data, error: authError } = await supabaseAuth.auth.getUser(token);
        if (authError || !data?.user) {
            throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED');
        } else {
            user = data.user;
        }

        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) throw new ApiError(400, "Missing required fields");

        const resultUrl = await processTool({
            userId: user.id,
            imageUrl,
            toolType: "face_correction",
            creditCost: 2, // Face Correction is +2 cost
            prompt: "Improve facial details, remove AI generation artifacts, fix facial distortions, perfect skin texture. Best for fashion and lifestyle shots."
        });

        return standardResponse.success({ image_url: resultUrl });
    } catch (error: any) {
        return standardResponse.error({ message: "Something went wrong. Please try again." } as unknown as Error);
    }
}
