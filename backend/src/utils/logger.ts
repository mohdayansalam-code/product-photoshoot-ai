export const logger = {
    info: (message: string, context?: Record<string, any>) => {
        const log = `[INFO] ${message} ${context ? JSON.stringify(context) : ""}`;
        console.log(log);
    },
    warn: (message: string, context?: Record<string, any>) => {
        const log = `[WARN] ${message} ${context ? JSON.stringify(context) : ""}`;
        console.warn(log);
    },
    error: (message: string, context?: Record<string, any>) => {
        const log = `[ERROR] ${message} ${context ? JSON.stringify(context) : ""}`;
        console.error(log);
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
