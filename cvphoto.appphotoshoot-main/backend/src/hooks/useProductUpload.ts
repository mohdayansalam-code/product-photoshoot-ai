import { useState } from "react";

interface UploadResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

export function useProductUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadProductImage = async (file: File): Promise<UploadResponse> => {
        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload-product", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to upload image");
            }

            return {
                success: true,
                imageUrl: data.imageUrl,
            };
        } catch (err: any) {
            console.error("Upload hook error:", err);
            const errorMessage = err.message || "An unexpected error occurred";
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadProductImage,
        isUploading,
        error,
    };
}
