export const logger = {
    info: (message: string, context?: Record<string, any>) => {
        const log = `[INFO] ${message} ${context ? JSON.stringify(context) : ""}`;
        if (process.env.WORKER_LOGGING === "true" || process.env.DEBUG_LOGGING === "true") {
            console.log(log);
        }
    },
    warn: (message: string, context?: Record<string, any>) => {
        const log = `[WARN] ${message} ${context ? JSON.stringify(context) : ""}`;
        console.warn(log);
    },
    error: (message: string, context?: Record<string, any>) => {
        const log = `[ERROR] ${message} ${context ? JSON.stringify(context) : ""}`;
        console.error(log);
    },
    worker: (jobId: string, status: string, duration: number, model: string, errorReason?: string) => {
        // Required Format: [WORKER] job_id status duration model
        let logStr = `[WORKER] ${jobId} ${status} ${duration}ms ${model}`;
        if (errorReason) {
            logStr += ` error=${errorReason}`;
        }
        console.log(logStr);
    },
    generation: (event: string, userId: string, jobId?: string, status?: string, meta?: Record<string, any>) => {
        const elements = [
            `[GENERATION]`,
            `event=${event}`,
            `user=${userId}`,
            jobId ? `job=${jobId}` : "",
            status ? `status=${status}` : "",
            meta ? JSON.stringify(meta) : ""
        ].filter(Boolean).join(" ");
        console.log(elements);
    }
};
