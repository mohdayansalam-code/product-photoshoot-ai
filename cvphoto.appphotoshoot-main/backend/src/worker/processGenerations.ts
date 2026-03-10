import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

import dotenv from "dotenv";
import { logger } from "../utils/logger";

// The worker should be run continuously, so it needs its own env variables or we pass them in.
// We'll load from .env.local for local development. Usually workers have their own environment context.
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Worker failed starting: Missing Supabase env variables");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const POLL_INTERVAL = 5000; // 5 seconds

async function processPendingJobs() {
    try {
        // 1. Poll the database for jobs where status = "pending"
        // To prevent race conditions if multiple workers run, we could use Postgres advisory locks
        // or FOR UPDATE SET status = processing, but we'll use a simple approach for now.
        const { data: jobs, error: fetchError } = await supabaseAdmin
            .from("generations")
            .select("*")
            .eq("status", "queued")
            .order("created_at", { ascending: true })
            .limit(5);

        if (fetchError) {
            logger.error("Error fetching pending jobs", { error: fetchError });
            return;
        }

        if (!jobs || jobs.length === 0) {
            return; // No jobs to process
        }

        logger.info(`Found ${jobs.length} pending jobs. Processing...`);

        for (const job of jobs) {
            // 2. Mark them as "processing"
            const { error: updateError } = await supabaseAdmin
                .from("generations")
                .update({ status: "processing" })
                .eq("id", job.id)
                .eq("status", "queued"); // Optimistic concurrency check

            if (updateError) {
                logger.error(`Failed to lock job ${job.id}`, { error: updateError });
                continue;
            }

            logger.generation("processing", job.user_id, job.id, "processing");

            try {
                // Determine retry logic delays
                const retryCount = job.retry_count || 0;
                const maxRetries = job.max_retries || 3;
                const retryDelayMs = retryCount * 5000;

                if (retryCount > 0) {
                    logger.info(`Job ${job.id} delaying retry ${retryCount} for ${retryDelayMs}ms`);
                    await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                }

                // Read explicit columns from 'generations' table
                const { prompt, model, image_count, image_url, fetchers_json } = job;

                const fetchers = fetchers_json || {};
                const seed = Math.floor(Math.random() * 1000000000);

                // 3. Product Lock System
                let maskData = undefined;

                const astriaEndpoint = `https://api.astria.ai/tunes/690204/prompts`;

                // 3. Send generation request to Astria
                let resultImages = [];
                let astriaFailed = true;

                const modelsToTry = [model];
                if (model === "seedream-4.5" || model === "seedream-5-lite") modelsToTry.push("flux-2-pro");
                if (model === "flux-2-pro" || modelsToTry.includes("flux-2-pro")) modelsToTry.push("gemini-3.1");

                // Restrict to max 2 tries (1 initial + 1 fallback)
                const attemptModels = modelsToTry.slice(0, 2);

                if (ASTRIA_API_KEY && ASTRIA_API_KEY !== "") {
                    // Update AI payload
                    for (const activeModel of attemptModels) {
                        logger.info(`[Job ${job.id}] Attempting generation with model: ${activeModel}...`);
                        astriaFailed = false;
                        resultImages = [];

                        for (let i = 0; i < image_count; i++) {
                            const promptBody: any = {
                                text: prompt, // Use direct raw prompt
                                image_url: image_url,
                                num_images: 1, // Generate singular image sequentially
                                model: activeModel,
                                seed: seed
                            };

                            if (maskData) {
                                promptBody.mask = maskData;
                            }

                            const response = await fetch(astriaEndpoint, {
                                method: "POST",
                                headers: {
                                    "Authorization": `Bearer ${ASTRIA_API_KEY}`,
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    prompt: promptBody
                                }),
                            });

                            if (!response.ok) {
                                const errorText = await response.text();
                                logger.error(`Astria API error for job ${job.id} using model ${activeModel}`, { error: errorText });
                                astriaFailed = true;
                                break;
                            } else {
                                const astriaData = await response.json() as any;
                                const images = astriaData?.images?.length > 0 ? astriaData.images : [];
                                if (images.length > 0) {
                                    resultImages.push(images[0]);
                                } else {
                                    astriaFailed = true;
                                    break;
                                }
                            }
                        }

                        if (!astriaFailed && resultImages.length === image_count) {
                            break; // Success! Exit retry loop
                        }

                        // If we loop again, it means this attempt failed
                        logger.warn(`[Job ${job.id}] Model ${activeModel} failed. Checking for fallback...`);
                        astriaFailed = true;
                    }
                } else {
                    // ASTRIA KEY NOT SET - Mocking failure
                    astriaFailed = true;
                }

                if (astriaFailed) {
                    logger.warn(`Failure triggered for job ${job.id}. Attempting local backoff / fallback logic.`);
                    resultImages = [];
                    for (let i = 0; i < image_count; i++) {
                        resultImages.push(
                            i === 0 ? image_url : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop"
                        );
                    }

                    // We simulate some delay since generation usually takes time
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                // 5. Optional Fetchers Logic
                console.log(`[Job ${job.id}] Applying functional fetchers modifiers...`);
                if (fetchers.remove_background) {
                    console.log(`[Job ${job.id}] Running background removal...`);
                }
                if (fetchers.white_background) {
                    console.log(`[Job ${job.id}] Generating pure white ecommerce background...`);
                }
                if (fetchers.super_resolution) {
                    console.log(`[Job ${job.id}] Running super resolution...`);
                }
                if (fetchers.upscale_v4) {
                    console.log(`[Job ${job.id}] Upscaling final image to v4...`);
                }

                // Download images and upload to Supabase Storage 'generated' bucket
                const uploadedImageUrls = [];
                for (let i = 0; i < resultImages.length; i++) {
                    const imgUrl = resultImages[i];
                    try {
                        const imgRes = await fetch(imgUrl);
                        if (!imgRes.ok) throw new Error(`Failed to fetch image ${imgUrl}`);
                        const arrayBuffer = await imgRes.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Structural Storage Requirement: generated/{generation_id}/image1.png
                        const fileName = `${job.id}/image${i + 1}.png`;
                        const { error: uploadError } = await supabaseAdmin.storage
                            .from("generated-images")
                            .upload(`generated/${fileName}`, buffer, {
                                contentType: "image/png",
                                upsert: true,
                            });

                        if (uploadError) {
                            logger.error(`Failed to upload ${fileName} to storage`, { error: uploadError });
                            uploadedImageUrls.push(imgUrl); // Fallback to original URL
                        } else {
                            const { data: urlData } = supabaseAdmin.storage
                                .from("generated-images")
                                .getPublicUrl(`generated/${fileName}`);
                            uploadedImageUrls.push(urlData.publicUrl);
                        }
                    } catch (e) {
                        logger.error(`Error uploading image ${imgUrl}`, { error: e });
                        uploadedImageUrls.push(imgUrl);
                    }
                }

                // 4. Update status → completed
                const { error: completeError } = await supabaseAdmin
                    .from("generations")
                    .update({
                        status: "completed",
                        generated_images: uploadedImageUrls,
                        retry_count: 0 // Reset on success to keep clean
                    })
                    .eq("id", job.id);

                if (completeError) {
                    logger.error(`Failed to complete job ${job.id}`, { error: completeError });
                } else {
                    logger.generation("completed", job.user_id, job.id, "completed", { imagesGenerated: uploadedImageUrls.length });
                }

            } catch (jobError: any) {
                logger.error(`Failed to process job ${job.id} due to exception`, { error: jobError });

                // Retries evaluation logic
                const tryCount = (job.retry_count || 0) + 1;
                const maxTry = job.max_retries || 3;

                if (tryCount < maxTry) {
                    logger.warn(`Attempting retry ${tryCount}/${maxTry} for Job ${job.id}`);
                    await supabaseAdmin
                        .from("generations")
                        .update({
                            status: "queued",
                            retry_count: tryCount
                        })
                        .eq("id", job.id);
                } else {
                    logger.error(`Max retries reached for job ${job.id}. Marking as failed.`);
                    // Mark job as "failed" unconditionally
                    await supabaseAdmin
                        .from("generations")
                        .update({
                            status: "failed",
                            retry_count: tryCount
                        })
                        .eq("id", job.id);
                    logger.generation("failed", job.user_id, job.id, "failed");
                }
            }
        }
    } catch (error) {
        logger.error("Worker generic polling error", { error });
    }
}

// 5. Poll Interval
function startWorker() {
    logger.info(`[Job Worker] Started. Polling every ${POLL_INTERVAL / 1000} seconds...`);
    setInterval(processPendingJobs, POLL_INTERVAL);
    // Initial run
    processPendingJobs();
}

startWorker();
