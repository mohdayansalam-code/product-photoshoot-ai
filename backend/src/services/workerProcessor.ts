// Native fetch used
import { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";
import { monitoring } from "./monitoring";
import { retryManager } from "./retryManager";
import { config } from "../config/env";
import { metrics } from "./metrics";
import { generateImageWithFal } from "./falProcessor";
export const workerProcessor = {
    classifyError: (error: any): "TEMPORARY" | "PERMANENT" => {
        const msg = error.message?.toLowerCase() || "";
        const code = error.status || error.statusCode || 0;

        // Temporary Provider Issues
        if (code === 429 || code >= 500) return "TEMPORARY";
        if (msg.includes("timeout") || msg.includes("network") || msg.includes("overload") || msg.includes("hangup")) return "TEMPORARY";
        
        // Permanent Input/Logic Issues
        if (code === 400 || code === 401 || code === 403) return "PERMANENT";
        if (msg.includes("invalid") || msg.includes("missing") || msg.includes("not allowed")) return "PERMANENT";

        return "TEMPORARY"; // Default to retry if unsure
    },

    recoverStuckJobs: async (supabaseAdmin: SupabaseClient) => {
        try {
            // Find jobs stuck in processing for > 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            
            const { data: stuckJobs, error } = await supabaseAdmin
                .from("generation_jobs")
                .select("id, retry_count, user_id, credits_used, credit_refunded")
                .eq("status", "processing")
                .lt("updated_at", tenMinutesAgo);

            if (error) {
                logger.error("Failed to query stuck jobs", { error });
                return;
            }

            if (stuckJobs && stuckJobs.length > 0) {
                logger.warn(`Found ${stuckJobs.length} stuck jobs. Recovering...`);
                
                for (const job of stuckJobs) {
                    const newRetryCount = (job.retry_count || 0) + 1;
                    
                    if (retryManager.shouldRetry(job.retry_count || 0)) {
                        await supabaseAdmin
                            .from("generation_jobs")
                            .update({ 
                                status: "queued", 
                                retry_count: newRetryCount,
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", job.id);
                        logger.info(`Recovered stuck job ${job.id} back to queue (Retry: ${newRetryCount})`);
                    } else {
                        await supabaseAdmin
                            .from("generation_jobs")
                            .update({ 
                                status: "failed", 
                                error_reason: "stuck_job_max_retries",
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", job.id);
                        logger.error(`Stuck job ${job.id} exceeded max retries. Marked as failed.`);
                    }
                }
            }
        } catch (e: any) {
            logger.error("Error in recoverStuckJobs", { error: e.message });
        }
    },

    processJob: async (job: any, supabaseAdmin: SupabaseClient) => {
        const startTime = Date.now();
        let isTimeout = false;
        
        // Timeout Protection mechanism
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                isTimeout = true;
                reject(new Error("JOB_TIMEOUT"));
            }, config.worker.timeoutMs);
        });

        // The actual work
        const workPromise = async () => {
            const retryCount = job.retry_count || 0;
            const delayMs = retryManager.calculateDelayMs(retryCount);
            
            if (retryCount > 0) {
                logger.info(`Job ${job.id} delaying retry ${retryCount} for ${delayMs}ms`);
                await retryManager.wait(delayMs);
            }

            // Read explicit columns from 'generation_jobs' table
            const { prompt, model, image_count, image_url } = job;
            const seed = Math.floor(Math.random() * 1000000000);
            
            await supabaseAdmin.from("generation_jobs").update({ processing_started_at: new Date().toISOString() }).eq("id", job.id);
            
            let resultImages: string[] = [];
            let providerFailed = true;

            // Model Fallback Chain
            const modelsToTry = [model];
            if (model === "seedream-5-lite") modelsToTry.push("seedream-4.5", "flux-2-pro");
            else if (model === "seedream-4.5") modelsToTry.push("flux-2-pro", "gemini-3.1");
            else modelsToTry.push("gemini-3.1");

            const attemptModels = modelsToTry.filter((v, i, a) => a.indexOf(v) === i).filter(m => config.models.allowed.includes(m)).slice(0, 2);

            for (const activeModel of attemptModels) {
                logger.info(`[Job ${job.id}] Attempting generation with model: ${activeModel}...`);
                providerFailed = false;
                resultImages = [];

                try {
                    for (let i = 0; i < image_count; i++) {
                        const urls = await generateImageWithFal({ prompt, productImage: image_url });
                        if (urls && urls.length > 0) {
                            resultImages.push(urls[0]);
                        } else {
                            providerFailed = true;
                            break;
                        }
                    }
                } catch (e: any) {
                    logger.error(`Provider error for job ${job.id} [${activeModel}]`, { error: e.message });
                    providerFailed = true;
                }

                if (!providerFailed && resultImages.length === image_count) break;
                logger.warn(`Model ${activeModel} failed. Attempting fallback if available...`);
                providerFailed = true;
            }

            if (providerFailed) {
                throw new Error("AI provider failed to generate images after retries/fallbacks.");
            }

            await supabaseAdmin.from("generation_jobs").update({ status: "generating", progress: 60 }).eq("id", job.id);

            // Fetchers Logic
            await supabaseAdmin.from("generation_jobs").update({ status: "enhancing", progress: 85 }).eq("id", job.id);

            const uploadedImageUrls = [];
            for (let i = 0; i < resultImages.length; i++) {
                const imgUrl = resultImages[i];
                try {
                    const imgRes = await fetch(imgUrl);
                    if (!imgRes.ok) throw new Error(`Fetch failed for ${imgUrl}`);
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    const fileName = `${job.id}/image${i + 1}.png`;
                    const { error: uploadError } = await supabaseAdmin.storage
                        .from("generated-images")
                        .upload(`generated/${fileName}`, buffer, {
                            contentType: "image/png",
                            upsert: true,
                        });

                    if (uploadError) throw uploadError;

                    // Verification Step: Ensure file is readable
                    const { data: listData } = await supabaseAdmin.storage
                        .from("generated-images")
                        .list(`generated/${job.id}`, { search: `image${i + 1}.png` });
                    
                    if (!listData || listData.length === 0) {
                        throw new Error(`Storage Verification Failed: image${i+1}.png not found after upload.`);
                    }

                    const { data: urlData } = supabaseAdmin.storage
                        .from("generated-images")
                        .getPublicUrl(`generated/${fileName}`);
                    uploadedImageUrls.push(urlData.publicUrl);
                } catch (e: any) {
                    logger.error(`Storage upload error for job ${job.id}`, { error: e.message });
                    throw e; // Fail job if storage is broken
                }
            }

            return uploadedImageUrls;
        };

        // Execution Wrapper (Try-Catch all + Timeout)
        try {
            const uploadedUrls = await Promise.race([workPromise(), timeoutPromise]) as string[];
            
            const durationMs = Date.now() - startTime;

            await supabaseAdmin
                .from("generation_jobs")
                .update({
                    status: "completed",
                    progress: 100,
                    generated_images: uploadedUrls,
                    retry_count: 0,
                    completed_at: new Date().toISOString(),
                    duration_ms: durationMs
                })
                .eq("id", job.id);

            // POST-GENERATION IMAGE UPDATE LOGIC
            const { data: profile } = await supabaseAdmin
                 .from("profiles")
                 .select("images_used")
                 .eq("id", job.user_id)
                 .single();
                 
            if (profile) {
                 await supabaseAdmin
                     .from("profiles")
                     .update({ images_used: profile.images_used + 6 })
                     .eq("id", job.user_id);
            }

            logger.worker(job.id, "completed", durationMs, job.model);
            
            // Collect Metrics
            await metrics.logGeneration(supabaseAdmin, {
                job_id: job.id,
                user_id: job.user_id,
                model: job.model,
                duration_ms: durationMs,
                success: true,
                credits_used: job.credits_used || 0,
                image_count: job.image_count || 0
            });

        } catch (jobError: any) {
            const durationMs = Date.now() - startTime;
            const errorReason = isTimeout ? "timeout" : jobError.message;
            const failureType = workerProcessor.classifyError(jobError);
            
            logger.worker(job.id, "failed", durationMs, job.model, `${errorReason} [Type: ${failureType}]`);
            monitoring.logWorkerFailure(job.id, jobError);

            const tryCount = (job.retry_count || 0) + 1;

            if (failureType === "TEMPORARY" && retryManager.shouldRetry(job.retry_count || 0) && !isTimeout) {
                logger.warn(`Returning job ${job.id} to queue (Try ${tryCount})`);
                await supabaseAdmin
                    .from("generation_jobs")
                    .update({
                        status: "queued",
                        retry_count: tryCount,
                        error_reason: errorReason,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", job.id);
            } else {
                logger.error(`Job ${job.id} permanently failed: ${errorReason}`);
                monitoring.logGenerationFailure(job.id, job.user_id, errorReason);

                await supabaseAdmin
                    .from("generation_jobs")
                    .update({
                        status: "failed",
                        retry_count: tryCount,
                        error_reason: errorReason,
                        completed_at: new Date().toISOString(),
                        duration_ms: durationMs
                    })
                    .eq("id", job.id);

                // Collect Metrics for failure
                await metrics.logGeneration(supabaseAdmin, {
                    job_id: job.id,
                    user_id: job.user_id,
                    model: job.model,
                    duration_ms: durationMs,
                    success: false,
                    error_reason: errorReason,
                    credits_used: job.credits_used || 0,
                    image_count: job.image_count || 0
                });
            }
        } finally {
            // Finished job
        }
    }
};
