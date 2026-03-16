// src/lib/apiError.ts
import { NextResponse } from "next/server";
import { logger } from "../services/logger";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public errorCode?: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export const standardResponse = {
    success: (data: any = {}, status: number = 200) => {
        return NextResponse.json({
            success: true,
            ...data
        }, { status });
    },
    
    error: (error: any, defaultMessage: string = "Internal server error") => {
        let statusCode = 500;
        let message = defaultMessage;
        let errorCode = "INTERNAL_ERROR";

        if (error instanceof ApiError) {
            statusCode = error.statusCode;
            message = error.message;
            errorCode = error.errorCode || "API_ERROR";
        } else if (error?.message) {
            // Leak prevention bounds - don't leak raw SQL errors or deep node traces in production
            if (process.env.ENVIRONMENT === "production") {
                if (!error.message.includes("SQL") && !error.message.includes("database")) {
                    message = error.message;
                }
            } else {
                 message = error.message;
            }
        }

        if (statusCode === 500) {
            // Specifically log untracked exceptions cleanly
            logger.error(`[API_CRASH] ${message}`, { original_error: error?.message || error });
        } else {
             logger.warn(`[API_ERROR] ${statusCode} ${message}`, { errorCode });
        }

        return NextResponse.json({
            success: false,
            error: message,
            errorCode
        }, { status: statusCode });
    }
};
