import { useState, useCallback } from "react";
import { Camera, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/ImageUploader";
import { SceneSelector } from "@/components/SceneSelector";
import { ModelSelector } from "@/components/ModelSelector";
import { ImageQuantitySelector } from "@/components/ImageQuantitySelector";
import { EnhancementsToggleGroup } from "@/components/EnhancementsToggleGroup";
import { GenerationGallery } from "@/components/GenerationGallery";
import { generateProduct, fetchResults, type Scene } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GeneratePage() {
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [model, setModel] = useState("seedream");
  const [imageCount, setImageCount] = useState(4);
  const [enhancements, setEnhancements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleUpload = useCallback((file: File | null) => {
    setProductFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setProductPreview(url);
    } else {
      setProductPreview(null);
    }
  }, []);

  const handleToggleEnhancement = (id: string) => {
    setEnhancements((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedImages([]);
    try {
      const { job_id } = await generateProduct({
        product_image: productFile,
        scene_prompt: selectedScene?.scene_prompt || "",
        recommended_model: model,
        image_count: imageCount,
        enhancements,
      });
      const result = await fetchResults(job_id);
      setGeneratedImages(result.images.slice(0, imageCount));
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: Controls */}
      <ScrollArea className="w-[380px] border-r border-border flex-shrink-0">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Generate Product Photoshoot</h1>
          </div>

          {/* Upload */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Upload Product</h2>
            <ImageUploader onUpload={handleUpload} preview={productPreview} />
          </section>

          {/* Scene Presets */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Scene Presets</h2>
            <SceneSelector selected={selectedScene} onSelect={setSelectedScene} />
            {selectedScene && (
              <p className="text-xs text-muted-foreground italic mt-1">
                {selectedScene.scene_prompt}
              </p>
            )}
          </section>

          {/* Model */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">AI Model</h2>
            <ModelSelector selected={model} onSelect={setModel} imageCount={imageCount} />
          </section>

          {/* Quantity */}
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Image Quantity</h2>
            <ImageQuantitySelector count={imageCount} onChange={setImageCount} />
          </section>

          {/* Enhancements */}
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">AI Enhancements <span className="text-muted-foreground font-normal">(Optional)</span></h2>
            <EnhancementsToggleGroup active={enhancements} onToggle={handleToggleEnhancement} />
          </section>

          {/* Generate */}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Photoshoot
          </Button>
        </div>
      </ScrollArea>

      {/* Right: Gallery */}
      <div className="flex-1 flex flex-col bg-secondary/30 p-6 overflow-auto">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Generated Images</h2>
        <GenerationGallery images={generatedImages} loading={loading} />
      </div>
    </div>
  );
}
