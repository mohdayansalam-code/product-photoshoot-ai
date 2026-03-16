import { createClient } from "@supabase/supabase-js";
import { logger } from "../services/logger";
import { workerProcessor } from "../services/workerProcessor";
import { config } from "../config/env";

const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

const POLL_INTERVAL = 5000;
const MAX_WORKER_JOBS = 3;
const WORKER_ID = `worker_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString().slice(-4)}`;

logger.info(`Worker starting with ID: ${WORKER_ID}`);

async function processPendingJobs() {
    try {
        await workerProcessor.recoverStuckJobs(supabaseAdmin);

        const { data: jobs, error: fetchError } = await supabaseAdmin
            .from("generations")
            .select("*")
            .eq("status", "queued")
            .order("created_at", { ascending: true })
            .limit(MAX_WORKER_JOBS);

        if (fetchError) {
            logger.error("Error fetching pending jobs", { error: fetchError });
            return;
        }

        if (!jobs || jobs.length === 0) return;

        logger.info(`Found ${jobs.length} pending jobs. Processing...`);

        for (const job of jobs) {
            // Optimistic lock with worker_id registration
            const { error: updateError } = await supabaseAdmin
                .from("generations")
                .update({ 
                    status: "processing", 
                    progress: 10, 
                    worker_id: WORKER_ID,
                    updated_at: new Date().toISOString() 
                })
                .eq("id", job.id)
                .eq("status", "queued"); 

            if (updateError) {
                logger.error(`Failed to lock job ${job.id} (likely picked by another worker)`, { error: updateError });
                continue;
            }

            logger.generation("processing", job.user_id, job.id, "processing", { worker: WORKER_ID });
            await workerProcessor.processJob(job, supabaseAdmin);
        }
    } catch (error: any) {
        logger.error("Worker generic polling error", { error: error.message });
    }
}

function startHeartbeat() {
    setInterval(() => {
        logger.info(`WORKER_HEALTHY ${new Date().toISOString()}`);
    }, 30000);
}

function startWorker() {
    logger.info(`[Job Worker] Started. Polling every ${POLL_INTERVAL / 1000} seconds...`);
    startHeartbeat();
    setInterval(processPendingJobs, POLL_INTERVAL);
    processPendingJobs();
}

startWorker();
