"use client";

import { useState } from "react";
import { useProductUpload } from "@/hooks/useProductUpload";
import { useGenerateProduct } from "@/hooks/useGenerateProduct";

export default function ProductUploader() {
    const { uploadProductImage, isUploading, error: uploadError } = useProductUpload();
    const { generateImages, loading: isGenerating, images: generatedImages, error: generateError } = useGenerateProduct();

    const [preview, setPreview] = useState<string | null>(null);
    const [template, setTemplate] = useState<"studio" | "lifestyle" | "ecommerce">("studio");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await uploadProductImage(file);

        if (result.success && result.imageUrl) {
            setPreview(result.imageUrl);
        }
    };

    const handleGenerate = async () => {
        if (!preview) return;
        await generateImages({ imageUrl: preview, template });
    };

    return (
        <div style={{ padding: 40 }}>
            <h2>Upload Product Image</h2>

            <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileChange}
            />

            {isUploading && <p>Uploading...</p>}

            {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}

            {preview && (
                <div style={{ marginTop: 20 }}>
                    <img src={preview} width={300} alt="Product Preview" style={{ display: "block", marginBottom: 15 }} />

                    <div style={{ marginBottom: 15 }}>
                        <label style={{ marginRight: 10 }}>Select Scene Template: </label>
                        <select
                            value={template}
                            onChange={(e) => setTemplate(e.target.value as any)}
                            style={{ padding: 5 }}
                        >
                            <option value="studio">Studio</option>
                            <option value="lifestyle">Lifestyle</option>
                            <option value="ecommerce">Ecommerce</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        style={{ padding: "10px 20px", cursor: isGenerating ? "not-allowed" : "pointer", background: "#000", color: "#fff", border: "none", borderRadius: 4 }}
                    >
                        {isGenerating ? "Generating..." : "Generate Photos"}
                    </button>
                </div>
            )}

            {generateError && <p style={{ color: "red", marginTop: 20 }}>{generateError}</p>}

            {generatedImages.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <h3>Generated Photos</h3>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 10 }}>
                        {generatedImages.map((imgUrl, i) => (
                            <img key={i} src={imgUrl} width={250} style={{ borderRadius: 8, objectFit: "cover" }} alt={`Generated product ${i}`} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
