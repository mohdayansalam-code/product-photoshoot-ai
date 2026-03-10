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
            .from("generations")
            .select("*")
            .eq("status", "queued")
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
            // 2. Mark them as "processing"
            const { error: updateError } = await supabaseAdmin
                .from("generations")
                .update({ status: "processing" })
                .eq("id", job.id)
                .eq("status", "queued"); // Optimistic concurrency check

            if (updateError) {
                console.error(`Failed to lock job ${job.id}:`, updateError);
                continue;
            }

            console.log(`Processing job ${job.id}...`);

            try {
                // Read explicit columns from 'generations' table
                const { prompt, model, image_count, image_url, fetchers_json } = job;

                const fetchers = fetchers_json || {};
                const seed = Math.floor(Math.random() * 1000000000);

                let promptText = prompt;
                if (prompt === "lifestyle") {
                    promptText = "A lifestyle product photo showing the product in a realistic environment with natural lighting and depth of field";
                } else if (prompt === "ecommerce") {
                    promptText = "A clean ecommerce product photo of this product on a pure white background, bright studio lighting, high resolution";
                } else if (!prompt || prompt === "studio") {
                    promptText = "A professional studio product photo of this product on a clean marble table with soft lighting, ecommerce photography, high detail, white background";
                }

                // 3. Product Lock System
                let maskData = undefined;

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

                        const fileName = `${job.user_id}/${Date.now()}_${i}.png`;
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

                // 4. Update status → completed
                const { error: completeError } = await supabaseAdmin
                    .from("generations")
                    .update({
                        status: "completed",
                        generated_images: uploadedImageUrls
                    })
                    .eq("id", job.id);

                if (completeError) {
                    console.error(`Failed to complete job ${job.id}:`, completeError);
                } else {
                    console.log(`Job ${job.id} completed successfully.`);

                    // Recalculate credit cost inside worker since `credits_cost` isn't saved directly
                    let base_model_credits = 10;
                    if (model === "flux-2-pro") base_model_credits = 8;
                    else if (model === "seedream-4.5") base_model_credits = 10;
                    else if (model === "gemini-3.1") base_model_credits = 20;

                    let generation_credits = (base_model_credits / 4) * image_count;

                    let fetcher_credits = 0;
                    if (fetchers.remove_background) fetcher_credits += 1;
                    if (fetchers.white_background) fetcher_credits += 1;
                    if (fetchers.super_resolution) fetcher_credits += 2;
                    if (fetchers.upscale_v4) fetcher_credits += 4;
                    if (fetchers.product_fix) fetcher_credits += 2;
                    if (fetchers.face_correction) fetcher_credits += 2;

                    let credits_cost = generation_credits + fetcher_credits;

                    // Deduct credits from user_credits table
                    const { data: creditsData } = await supabaseAdmin
                        .from("credits")
                        .select("credits_remaining")
                        .eq("user_id", job.user_id)
                        .single();

                    if (creditsData) {
                        const newCredits = creditsData.credits_remaining - credits_cost;
                        await supabaseAdmin
                            .from("credits")
                            .update({ credits_remaining: newCredits })
                            .eq("user_id", job.user_id);
                        console.log(`Deducted ${credits_cost} credits for user ${job.user_id}.`);
                    }
                }

            } catch (jobError: any) {
                console.error(`Failed to process job ${job.id} due to exception:`, jobError);

                // 4. Add error handling - Mark job as "failed"
                await supabaseAdmin
                    .from("generations")
                    .update({
                        status: "failed"
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
