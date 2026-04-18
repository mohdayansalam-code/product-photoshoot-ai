import { NextRequest } from "next/server";
import { logger } from "@/utils/logger";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";
import { rateLimiter } from "@/services/rateLimiter";
import { buildPrompt } from "@/lib/promptBuilder";
import { creditSystem } from "@/services/creditSystem";
import { requireAuthenticatedUser } from "@/lib/routeAuth";

export async function POST(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await requireAuthenticatedUser(
            req.headers.get("authorization")
        );

        const body = await req.json();

        const product_image = body.product_image || body.imageUrl;
        const background_image = body.background_image || null;
        const model_image = body.model_image || null;
        const user_prompt = body.user_prompt;
        const generation_type = body.generation_type || "product";

        const scene = body.scene;

        let finalPrompt = buildPrompt({
            userPrompt: user_prompt,
            generationType: generation_type,
            hasModel: !!model_image,
            hasBackground: !!background_image
        });

        if (scene === "luxury-skincare-studio") {
            finalPrompt += ", luxury skincare studio, marble surface, soft beauty lighting, premium product photography";
        } else if (scene === "amazon-white-background") {
            finalPrompt += ", pure white seamless background, clean professional ecommerce product photography";
        } else if (scene === "jewelry-macro-shot") {
            finalPrompt += ", macro jewelry photography on dark velvet, dramatic spotlight, luxury close-up";
        }

        let model = body.recommended_model || body.model;
        if (!model || !config.models.allowed.includes(model)) {
            const p = finalPrompt.toLowerCase();
            if (p.includes("different angles") || p.includes("model poses") || p.includes("street photoshoot") || p.includes("fashion shoot") || p.includes("variations")) {
                model = "gemini-3.1";
            } else if (p.includes("consistent") || p.includes("same product") || p.includes("same scene") || p.includes("product photoshoot")) {
                model = "seedream-4.5";
            } else if (p.includes("product photography") || p.includes("studio photo") || p.includes("ecommerce product")) {
                model = "seedream-5-lite";
            } else {
                model = config.models.defaultGeneration;
            }
        }

        const fetchers = body.fetchers || {};
        if (background_image) fetchers.background_image = background_image;
        if (model_image) fetchers.model_image = model_image;
        
        const image_count = Math.min(Math.max(body.image_count ?? 4, 1), 4);

        if (!product_image) {
            throw new ApiError(400, "Missing product_image");
        }
        
        
        if (!finalPrompt || finalPrompt.trim() === "") {
            finalPrompt = "professional product photography";
        }

        let base_model_credits = 10;
        const MODEL_CREDITS: Record<string, number> = {
            "flux-2-pro": 8,
            "seedream-5-lite": 12,
            "seedream-4.5": 10,
            "gemini-3.1": 20
        };
        if (MODEL_CREDITS[model]) {
            base_model_credits = MODEL_CREDITS[model];
        }

        let generation_credits = (base_model_credits / 4) * image_count;
        let fetcher_credits = 0;
        
        if (fetchers.remove_background) fetcher_credits += 1;
        if (fetchers.white_background) fetcher_credits += 1;
        if (fetchers.super_resolution) fetcher_credits += 2;
        if (fetchers.upscale_v4) fetcher_credits += 4;
        if (fetchers.product_fix) fetcher_credits += 2;
        if (fetchers.face_correction) fetcher_credits += 2;

        const credits_cost = generation_credits + fetcher_credits;

        await rateLimiter.checkLimit(supabaseAdmin, user.id, 10, 60000, "generation");

        // STEP 1 — check credits
        const hasCredits = await creditSystem.hasCredits(supabaseAdmin, user.id, credits_cost);
        if (!hasCredits) {
            throw new ApiError(402, "Not enough credits", "INSUFFICIENT_CREDITS");
        }

        const request_id = body.request_id || req.headers.get("x-request-id");
        
        // STEP 2 — deduct credits
        await creditSystem.deductCredits(
            supabaseAdmin,
            user.id,
            credits_cost,
            "generation",
            `Photoshoot generation: ${model}`
        );

        let jobId;
        let idempotent = false;

        try {
            // STEP 3 & 4 — save generation job to DB 
            // (this puts it in the queue for the worker)
            const { data: insertData, error: dbError } = await supabaseAdmin.from("generations").insert({
                user_id: user.id,
                request_id: request_id || null, // handle idempotency mapping
                image_url: product_image,
                prompt: finalPrompt,
                model: model,
                image_count: image_count,
                fetchers: fetchers,
                credits_used: credits_cost,
                status: "queued"
            }).select("id").single();

            if (dbError) {
                // Check if idempotency conflict
                if (dbError.code === '23505' && request_id) {
                    const { data: existing } = await supabaseAdmin.from("generations").select("id").eq("request_id", request_id).single();
                    if (existing) {
                        jobId = existing.id;
                        idempotent = true;
                        // Refund the credits we just deducted since it's a duplicate request
                        await creditSystem.refundCredits(supabaseAdmin, user.id, credits_cost, "refund", "Idempotent generation request duplicate refund");
                    } else {
                        throw new Error(`DB Error: ${dbError.message}`);
                    }
                } else {
                    throw new Error(`DB Error: ${dbError.message}`);
                }
            } else {
                jobId = insertData?.id;
            }

            if (!jobId) throw new Error("Failed to return job ID from database");

        } catch (error: any) {
            // STEP 5 — refund credits
            await creditSystem.refundCredits(
                supabaseAdmin,
                user.id,
                credits_cost,
                "refund",
                "Generation enqueue failed refund"
            );
            logger.error("Generation insert failed, credits refunded", { error: error.message });
            throw new ApiError(500, "Failed to initialize generation safely.");
        }

        if (idempotent) {
            logger.info(`Idempotent hit via Node.js for ${request_id}`);
        }

        logger.generation("started", user.id, jobId, "queued", { credits_deducted: credits_cost, idempotent: idempotent });

        return standardResponse.success({
            generation_id: jobId,
            status: "queued"
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
