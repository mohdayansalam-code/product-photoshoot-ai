// src/config/env.ts

export const requireEnv = (name: string, fallback?: string): string => {
    const value = process.env[name] || fallback;
    if (value === undefined || value === "") {
        throw new Error(`CRITICAL: Required environment variable ${name} is missing.`);
    }
    return value;
};

// Validate critical ENV on startup
export const config = {
    env: requireEnv("ENVIRONMENT", "development"),
    nodeEnv: requireEnv("NODE_ENV", "development"),
    supabase: {
        url: requireEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    },
    fal: {
        apiKey: process.env.FAL_API_KEY || "", // Optional if falling back to mocks
    },
    models: {
        defaultGeneration: requireEnv("DEFAULT_GENERATION_MODEL", "seedream-5-lite"),
        defaultVariation: requireEnv("DEFAULT_VARIATION_MODEL", "gemini-3.1"),
        defaultEdit: requireEnv("DEFAULT_EDIT_MODEL", "flux-2-pro"),
        allowed: ["seedream-4.5", "seedream-5-lite", "flux-2-pro", "gemini-3.1", "flux-2-turbo"],
    },
    features: {
        productFix: {
            enabled: requireEnv("ENABLE_PRODUCT_FIX", "true") === "true",
            credits: parseInt(requireEnv("CREDITS_PRODUCT_FIX", "2"), 10)
        }
    },
    worker: {
        timeoutMs: parseInt(requireEnv("JOB_TIMEOUT", "300000"), 10),
        maxRetries: parseInt(requireEnv("MAX_RETRY_COUNT", "3"), 10),
    },
    security: {
        devAuthBypass: process.env.DEV_AUTH_BYPASS === "true" && process.env.ENVIRONMENT !== "production",
    }
};

// Only validate immediately if not in build phase to prevent build crashes
if (process.env.NEXT_PHASE !== 'phase-production-build') {
    requireEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    requireEnv("NODE_ENV", "development");
}
