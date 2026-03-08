import { Download, Maximize, Eraser, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerationGalleryProps {
  images: string[];
  loading: boolean;
}

export function GenerationGallery({ images, loading }: GenerationGalleryProps) {
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center animate-pulse-soft">
          <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">Generating photoshoot...</p>
          <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
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
        <p className="text-sm text-muted-foreground mt-1">
          Upload a product and generate your first photoshoot
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-1">
      {images.map((img, i) => (
        <div
          key={i}
          className="group relative rounded-xl overflow-hidden border border-border shadow-soft bg-card"
        >
          <img src={img} alt={`Generated ${i + 1}`} className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
            <div className="flex gap-1.5">
              {[
                { icon: Download, label: "Download" },
                { icon: Maximize, label: "Upscale" },
                { icon: Eraser, label: "Remove BG" },
                { icon: Copy, label: "Variations" },
              ].map(({ icon: Icon, label }) => (
                <Button
                  key={label}
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
