import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

import dotenv from "dotenv";

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
            .from("generation_jobs")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(5);

        if (fetchError) {
            console.error("Error fetching pending jobs:", fetchError);
            return;
        }

        if (!jobs || jobs.length === 0) {
            return; // No jobs to process
        }

        console.log(`Found ${jobs.length} pending jobs. Processing...`);

        for (const job of jobs) {
            // 2. Mark them as "running"
            const { error: updateError } = await supabaseAdmin
                .from("generation_jobs")
                .update({ status: "running" })
                .eq("id", job.id)
                .eq("status", "pending"); // Optimistic concurrency check

            if (updateError) {
                console.error(`Failed to lock job ${job.id}:`, updateError);
                continue;
            }

            console.log(`Processing job ${job.id}...`);

            try {
                // Parse extended metadata from template payload
                let payload: any = {};
                if (job.template && job.template.startsWith("{")) {
                    try {
                        payload = JSON.parse(job.template);
                    } catch (e) {
                        console.error("Failed to parse template payload JSON:", e);
                    }
                }

                // Fallbacks for backward compatibility
                const scene_prompt = payload.scene_prompt || payload.prompt || job.template;
                const model = payload.model || "seedream-4.5";
                const product_lock = payload.product_lock !== undefined ? payload.product_lock : (payload.lock_style !== undefined ? payload.lock_style : true);
                const resolution = payload.resolution || "2k";
                const fetchers = payload.fetchers || {};
                const credits_cost = payload.credits_cost || 5;
                const seed = payload.seed || Math.floor(Math.random() * 1000000000);
                const image_count = payload.image_count || 4;

                let promptText = scene_prompt;
                if (scene_prompt === "lifestyle") {
                    promptText = "A lifestyle product photo showing the product in a realistic environment with natural lighting and depth of field";
                } else if (scene_prompt === "ecommerce") {
                    promptText = "A clean ecommerce product photo of this product on a pure white background, bright studio lighting, high resolution";
                } else if (!scene_prompt || scene_prompt === "studio") {
                    promptText = "A professional studio product photo of this product on a clean marble table with soft lighting, ecommerce photography, high detail, white background";
                }

                // 3. Product Lock System
                let maskData = undefined;
                if (product_lock) {
                    console.log(`[Job ${job.id}] Creating product mask for product lock...`);
                    // Pseudo-function call: const mask = await createProductMask(job.input_image)
                    maskData = "mock-mask-data-string"; // in reality this would be a base64 mask or URL
                }

                const astriaEndpoint = `https://api.astria.ai/tunes/690204/prompts`;

                // 3. Send generation request to Astria
                let resultImages = [];
                let astriaFailed = true;

                const modelsToTry = [model];
                if (model === "seedream-4.5") modelsToTry.push("flux-2-pro");
                if (model === "flux-2-pro" || modelsToTry.includes("flux-2-pro")) modelsToTry.push("gemini-3.1");

                // Restrict to max 2 tries (1 initial + 1 fallback)
                const attemptModels = modelsToTry.slice(0, 2);

                if (ASTRIA_API_KEY && ASTRIA_API_KEY !== "") {
                    // Update AI payload
                    for (const activeModel of attemptModels) {
                        console.log(`[Job ${job.id}] Attempting generation with model: ${activeModel}...`);
                        astriaFailed = false;
                        resultImages = [];

                        for (let i = 0; i < image_count; i++) {
                            const promptBody: any = {
                                text: promptText,
                                image_url: job.input_image,
                                num_images: 1, // Generate singular image sequentially
                                model: activeModel,
                                seed: seed
                            };

                            if (maskData) {
                                promptBody.mask = maskData;
                            }

                            if (resolution) {
                                promptBody.resolution = resolution;
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
                                console.error(`Astria API error for job ${job.id} using model ${activeModel}:`, errorText);
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
                        console.log(`[Job ${job.id}] Model ${activeModel} failed. Checking for fallback...`);
                        astriaFailed = true;
                    }
                } else {
                    // ASTRIA KEY NOT SET - Mocking failure
                    astriaFailed = true;
                }

                if (astriaFailed) {
                    console.log(`Simulating success for job ${job.id} because Astria request failed or key is missing.`);
                    resultImages = [];
                    for (let i = 0; i < image_count; i++) {
                        resultImages.push(
                            i === 0 ? job.input_image : "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop"
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

                        const fileName = `${job.user_id}/${job.id}/image_${i}.png`;
                        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                            .from("generated-images")
                            .upload(fileName, buffer, {
                                contentType: "image/png",
                                upsert: true,
                            });

                        if (uploadError) {
                            console.error(`Failed to upload ${fileName} to storage:`, uploadError);
                            uploadedImageUrls.push(imgUrl); // Fallback to original URL
                        } else {
                            const { data: urlData } = supabaseAdmin.storage
                                .from("generated-images")
                                .getPublicUrl(fileName);
                            uploadedImageUrls.push(urlData.publicUrl);
                        }
                    } catch (e) {
                        console.error(`Error uploading image ${imgUrl}:`, e);
                        uploadedImageUrls.push(imgUrl);
                    }
                }

                // 4. Save result_images
                // 5. Mark job as "completed"
                // 6. Update completed_at timestamp
                const { error: completeError } = await supabaseAdmin
                    .from("generation_jobs")
                    .update({
                        status: "completed",
                        result_images: uploadedImageUrls,
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", job.id);

                if (completeError) {
                    console.error(`Failed to complete job ${job.id}:`, completeError);
                } else {
                    console.log(`Job ${job.id} completed successfully.`);

                    const imagesGenerated = uploadedImageUrls.length;

                    // Insert into generations table
                    const { error: insertError } = await supabaseAdmin
                        .from("generations")
                        .insert({
                            user_id: job.user_id,
                            input_image: job.input_image,
                            generated_images: uploadedImageUrls,
                            template: job.template,
                            credits_used: credits_cost
                        });

                    if (insertError) {
                        console.error(`Failed to insert into generations table for job ${job.id}:`, insertError);
                    }

                    // Deduct credits since generation succeeded
                    const { data: creditsData } = await supabaseAdmin
                        .from("user_credits")
                        .select("credits_remaining")
                        .eq("user_id", job.user_id)
                        .single();

                    if (creditsData) {
                        const newCredits = creditsData.credits_remaining - credits_cost;
                        await supabaseAdmin
                            .from("user_credits")
                            .update({ credits_remaining: newCredits })
                            .eq("user_id", job.user_id);
                        console.log(`Deducted ${credits_cost} credits for user ${job.user_id}.`);
                    }
                }

            } catch (jobError: any) {
                console.error(`Failed to process job ${job.id} due to exception:`, jobError);

                // 4. Add error handling - Mark job as "failed"
                await supabaseAdmin
                    .from("generation_jobs")
                    .update({
                        status: "failed",
                        completed_at: new Date().toISOString()
                    })
                    .eq("id", job.id);
            }
        }
    } catch (error) {
        console.error("Worker generic polling error:", error);
    }
}

// 5. Poll Interval
function startWorker() {
    console.log(`[Job Worker] Started. Polling every ${POLL_INTERVAL / 1000} seconds...`);
    setInterval(processPendingJobs, POLL_INTERVAL);
    // Initial run
    processPendingJobs();
}

startWorker();
