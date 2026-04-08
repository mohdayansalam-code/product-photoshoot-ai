import { logger } from "./logger";

// Placeholder for Sentry/Datadog integration
// import * as Sentry from "@sentry/node";

export const monitoring = {
    logError: (error: Error, context?: Record<string, any>) => {
        // Sentry.captureException(error, { extra: context });
        logger.error(`[MONITORING] Error logged`, { message: error.message, ...context });
    },

    logWorkerFailure: (jobId: string, error: Error) => {
        // Sentry.captureException(error, { tags: { job_id: jobId, type: 'worker_failure' } });
        logger.error(`[MONITORING] Worker failure for job ${jobId}: ${error.message}`);
    },

    logGenerationFailure: (jobId: string, userId: string, errorReason: string) => {
        logger.error(`[MONITORING] Generation failed: ${jobId} for user ${userId}. Reason: ${errorReason}`);
    }
};
