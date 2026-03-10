import { useState } from "react";

interface GenerateParams {
    imageUrl: string;
    template: "studio" | "lifestyle" | "ecommerce";
}

interface GenerateResponse {
    success: boolean;
    images?: string[];
    error?: string;
}

export function useGenerateProduct() {
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const generateImages = async (params: GenerateParams): Promise<GenerateResponse> => {
        setLoading(true);
        setError(null);
        setImages([]);

        try {
            // Setup timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            const response = await fetch("/api/generate-product", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(params),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate images");
            }

            if (data.success && data.images) {
                setImages(data.images);
                return { success: true, images: data.images };
            } else {
                throw new Error("Invalid response format from server");
            }

        } catch (err: any) {
            let errorMessage = err.message || "An unexpected error occurred.";
            if (err.name === "AbortError") {
                errorMessage = "Request timed out. The generation took too long.";
            }

            console.error("Generator hook error:", err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    return {
        generateImages,
        loading,
        images,
        error,
    };
}
