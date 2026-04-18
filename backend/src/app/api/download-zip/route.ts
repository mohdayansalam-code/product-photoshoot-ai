import { NextRequest, NextResponse } from "next/server";
import { standardResponse, ApiError } from "@/lib/apiError";
import { logger } from "@/services/logger";
import JSZip from "jszip";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const generation_id = searchParams.get("generation_id");

        if (!generation_id) {
            throw new ApiError(400, "Missing generation_id parameter");
        }

        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const { data: jobData, error: dbError } = await supabaseAdmin
            .from("generations")
            .select("generated_images")
            .eq("id", generation_id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !jobData) {
            throw new ApiError(404, "Generation not found or access denied");
        }

        const imageUrls = jobData.generated_images as string[] | null;

        if (!imageUrls || imageUrls.length === 0) {
            throw new ApiError(400, "No images available for download in this generation");
        }

        const zip = new JSZip();
        
        // Fetch all images in parallel
        const imagePromises = imageUrls.map(async (url, index) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch image ${index}`);
                const blob = await response.arrayBuffer();
                const extension = url.split('.').pop()?.split('?')[0] || 'png';
                zip.file(`generation_${generation_id}_${index + 1}.${extension}`, blob);
            } catch (err) {
                logger.error(`Zip item fetch failed: ${url}`, { error: err });
            }
        });

        await Promise.all(imagePromises);

        const content = await zip.generateAsync({ type: "nodebuffer" });
        const responseBody = new Uint8Array(content);

        return new NextResponse(responseBody, {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename=photoshoot_${generation_id}.zip`,
                "Content-Length": responseBody.byteLength.toString(),
            },
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
