import { useState, useEffect, useRef, useCallback } from "react";
import { fetchResults, type GenerationJob } from "@/lib/api";

interface UsePollingOptions {
    interval?: number;
    enabled?: boolean;
    onSuccess?: (data: GenerationJob) => void;
    onError?: (error: any) => void;
}

export function usePolling(jobId: string | null, options: UsePollingOptions = {}) {
    const { interval = 3000, enabled = true, onSuccess, onError } = options;
    const [data, setData] = useState<GenerationJob | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);
    
    const isPolling = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const poll = useCallback(async () => {
        if (!isPolling.current || !jobId) return;

        try {
            const result = await fetchResults(jobId);
            setData(result);
            
            if (result.status === "completed") {
                isPolling.current = false;
                setLoading(false);
                onSuccess?.(result);
            } else if (result.status === "failed") {
                isPolling.current = false;
                setLoading(false);
                const err = new Error("Generation failed");
                setError(err);
                onError?.(err);
            } else {
                // Continue polling
                timeoutRef.current = setTimeout(poll, interval);
            }
        } catch (err: any) {
            // Transient error: stop auto-polling but keep state so user can retry manually
            isPolling.current = false;
            setLoading(false);
            setError(err);
            onError?.(err);
        }
    }, [jobId, interval, onSuccess, onError]);

    useEffect(() => {
        if (!jobId || !enabled) {
            isPolling.current = false;
            setLoading(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            return;
        }

        isPolling.current = true;
        setLoading(true);
        setError(null);
        poll();

        return () => {
            isPolling.current = false;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [jobId, enabled, poll]);

    const restart = useCallback(() => {
        if (!jobId) return;
        setError(null);
        setLoading(true);
        isPolling.current = true;
        poll();
    }, [jobId, poll]);

    return { data, loading, error, restart };
}
