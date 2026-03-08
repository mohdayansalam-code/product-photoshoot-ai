import { Download, Maximize, Eraser, Copy, Loader2, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface GenerationGalleryProps {
  images: string[];
  loading: boolean;
  imageCount?: number;
}

export function GenerationGallery({ images, loading, imageCount = 4 }: GenerationGalleryProps) {
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    if (!loading) { setProgress(0); setGeneratedCount(0); return; }
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + Math.random() * 12 + 3, 95);
        setGeneratedCount(Math.min(Math.floor((next / 100) * imageCount), imageCount - 1));
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [loading, imageCount]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center"
        >
          <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
        </motion.div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-foreground">Generating photoshoot...</p>
          <p className="text-sm text-muted-foreground">{generatedCount} / {imageCount} images generated</p>
        </div>
        <div className="w-full max-w-xs space-y-1.5">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{Math.round(progress)}%</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          {Array.from({ length: imageCount }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Copy className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="font-semibold text-foreground">No images yet</p>
        <p className="text-sm text-muted-foreground mt-1">Upload a product and generate your first photoshoot</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-1">
      {images.map((img, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="group relative rounded-xl overflow-hidden border border-border shadow-soft bg-card"
        >
          <img src={img} alt={`Generated ${i + 1}`} className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <div className="flex gap-1.5">
              {[
                { icon: Download, label: "Download" },
                { icon: Maximize, label: "Upscale" },
                { icon: Eraser, label: "Remove BG" },
                { icon: Pencil, label: "Edit" },
              ].map(({ icon: Icon, label }) => (
                <Button key={label} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card">
                  <Icon className="h-3 w-3" /> {label}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
