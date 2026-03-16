import { logger } from "./logger";

export const retryManager = {
    getMaxRetries: (): number => {
        const envMax = parseInt(process.env.MAX_RETRY_COUNT || "3", 10);
        return isNaN(envMax) ? 3 : envMax;
    },

    shouldRetry: (currentRetryCount: number): boolean => {
        return currentRetryCount < retryManager.getMaxRetries();
    },

    calculateDelayMs: (currentRetryCount: number): number => {
        // Exponential delay: retry_count * 10 seconds
        return currentRetryCount * 10000; 
    },

    wait: async (delayMs: number) => {
        return new Promise(resolve => setTimeout(resolve, delayMs));
    }
};
