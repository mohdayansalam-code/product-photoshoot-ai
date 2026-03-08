import { useState, useCallback } from "react";
import { Camera, Sparkles, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { SceneSelector } from "@/components/SceneSelector";
import { ModelSelector } from "@/components/ModelSelector";
import { ImageQuantitySelector } from "@/components/ImageQuantitySelector";
import { EnhancementsToggleGroup } from "@/components/EnhancementsToggleGroup";
import { GenerationGallery } from "@/components/GenerationGallery";
import { generateProduct, fetchResults, type Scene } from "@/lib/api";
import { useProductStore } from "@/lib/productStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const QUICK_TAGS = [
  "luxury",
  "studio lighting",
  "soft shadows",
  "ecommerce product",
  "editorial fashion",
  "macro shot",
];

export default function GeneratePage() {
  const { products } = useProductStore();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("seedream");
  const [imageCount, setImageCount] = useState(4);
  const [enhancements, setEnhancements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleUpload = useCallback((file: File | null) => {
    setProductFile(file);
    setProductPreview(file ? URL.createObjectURL(file) : null);
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
      <ScrollArea className="w-[380px] border-r border-border flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 space-y-6"
        >
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Generate Product Photoshoot</h1>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Describe Your Photoshoot</h2>
            <motion.div
              className="rounded-xl border border-border bg-card shadow-soft p-3 space-y-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all duration-200"
            >
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={"Describe your photoshoot idea...\n\nExample:\nLuxury product photography\nsoft studio lighting\nminimal background\npremium ecommerce style"}
                className="min-h-[100px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 resize-none text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    onClick={() => setPrompt((prev) => prev ? `${prev}, ${tag}` : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </motion.div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Select Product</h2>
            <ImageUploader onUpload={(file) => { handleUpload(file); setSelectedProductId(null); }} preview={!selectedProductId ? productPreview : null} />
            {products.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Or choose from library</p>
                <div className="grid grid-cols-4 gap-2">
                  {products.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProductId(p.id); setProductFile(null); setProductPreview(null); }}
                      className={cn(
                        "relative rounded-lg border overflow-hidden aspect-square transition-all",
                        selectedProductId === p.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      {selectedProductId === p.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary-foreground drop-shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Scene Presets</h2>
            <SceneSelector selected={selectedScene} onSelect={setSelectedScene} />
            {selectedScene && (
              <p className="text-xs text-muted-foreground italic mt-1">{selectedScene.scene_prompt}</p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">AI Model</h2>
            <ModelSelector selected={model} onSelect={setModel} imageCount={imageCount} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">Image Quantity</h2>
            <ImageQuantitySelector count={imageCount} onChange={setImageCount} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">AI Enhancements <span className="text-muted-foreground font-normal">(Optional)</span></h2>
            <EnhancementsToggleGroup active={enhancements} onToggle={handleToggleEnhancement} />
          </section>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full h-12 gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {loading ? "Generating..." : "Generate Photoshoot"}
            </Button>
          </motion.div>
        </motion.div>
      </ScrollArea>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col bg-secondary/30 p-6 overflow-auto"
      >
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Generated Images</h2>
        <GenerationGallery images={generatedImages} loading={loading} imageCount={imageCount} />
      </motion.div>
    </div>
  );
}
