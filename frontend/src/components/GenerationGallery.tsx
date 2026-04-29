import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Maximize, Eraser, Copy, Loader2, Pencil, Wrench, SplitSquareHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ToolBadge } from "./ToolBadge";
import { ToolImprovementSummary } from "./ToolImprovementSummary";
import { CompareModal } from "./CompareModal";

interface GenerationGalleryProps {
  images: string[];
  loading: boolean;
  imageCount?: number;
  jobId?: string;
  progress?: number;
  status?: string;
}

export const GenerationGallery = memo(function GenerationGallery({ 
  images, 
  loading, 
  imageCount = 4, 
  jobId, 
  progress = 0, 
  status = "processing" 
}: GenerationGalleryProps) {
  const navigate = useNavigate();
  const generatedCount = Math.min(Math.floor((progress / 100) * imageCount), imageCount - 1);
  const { toast } = useToast();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [varyingImage, setVaryingImage] = useState<string | null>(null);
  const [comparingImage, setComparingImage] = useState<{ original: string, result: string, tool: string } | null>(null);

  const handleDownload = async (url: string, index: number) => {
    setDownloadingUrl(url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `generation-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast({
        title: "Download complete",
        description: "Image saved to your device.",
      });
    } catch (err) {
      console.error("Failed to download image", err);
      toast({
        title: "Download failed",
        description: "Could not fetch image from storage.",
        variant: "destructive",
      });
    } finally {
      setDownloadingUrl(null);
    }
  };

  const handleTool = async (url: string, tool: 'upscale' | 'remove_bg' | 'product_fix' | string, index: number) => {
    const toolId = `${tool}-${index}`;
    setActiveToolId(toolId);
    try {
      const { callImageTool } = await import('@/lib/api');
      await callImageTool(url, tool);
      
      let title = "Action started";
      let desc = "Processing... check your library shortly.";
      
      if (tool === 'upscale') { title = "Upscaling started"; }
      else if (tool === 'remove_bg') { title = "Background removal started"; }
      else if (tool === 'product_fix') { 
         title = "Product Fix started";
         desc = "Applying AI improvements. This may take a moment.";
      }

      toast({
        title,
        description: desc,
      });
    } catch (err: any) {
      console.error(`Failed to start ${tool}`, err);
      toast({
        title: tool === 'product_fix' ? "Product Fix failed" : "Action failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActiveToolId(null);
    }
  };

  const handleVariations = async (url: string) => {
    if (!jobId) { 
      toast({
        title: "Source missing",
        description: "Cannot generate variations for this image right now.",
        variant: "destructive"
      });
      return; 
    }
    try {
      setVaryingImage(url);
      const { generateVariations } = await import('@/lib/api');
      await generateVariations(jobId, url);
      toast({
        title: "Variations pending",
        description: "We're generating similar poses. Check history soon.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Variations failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVaryingImage(null);
    }
  };

  const getLoadingMessage = () => {
    switch(status) {
      case "product_fix": return "Fixing labels & packaging...";
      case "remove_bg": return "Removing background...";
      case "upscale": return "Enhancing resolution...";
      case "queued": return "Waiting for AI...";
      default: return `${status}...`;
    }
  };

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
          <p className="font-semibold text-foreground capitalize">{getLoadingMessage()}</p>
          <p className="text-sm text-muted-foreground">{generatedCount} / {imageCount} images processed</p>
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
          {/* Tool Badge Overlay (if applicable) */}
          <div className="absolute top-2 left-2 z-10 select-none">
             {status === "completed" && <ToolBadge tool="product_fix" className="shadow-black/5" />}
          </div>

          <img src={img} onError={(e) => e.currentTarget.style.display = "none"} alt={`Generated ${i + 1}`} className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/45 transition-all duration-300 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 p-2">
            <div className="flex flex-wrap justify-center gap-1.5 w-full">
              <Button disabled={downloadingUrl === img} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => handleDownload(img, i)}>
                {downloadingUrl === img ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Download
              </Button>
              {status === "completed" && (
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => setComparingImage({ original: img, result: img, tool: 'Product Fix' })}>
                  <SplitSquareHorizontal className="h-3 w-3 text-primary" /> Compare
                </Button>
              )}
              {status === "completed" && (
                <Button disabled={activeToolId === `reapply-${i}`} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => handleTool(img, 'product_fix', i)}>
                   {activeToolId === `reapply-${i}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />} Apply Again
                </Button>
              )}
              <Button disabled={activeToolId === `upscale-${i}`} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => handleTool(img, 'upscale', i)}>
                {activeToolId === `upscale-${i}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Maximize className="h-3 w-3" />} Upscale
              </Button>
              <Button disabled={activeToolId === `remove_bg-${i}`} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => handleTool(img, 'remove_bg', i)}>
                {activeToolId === `remove_bg-${i}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eraser className="h-3 w-3" />} Remove BG
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => navigate(`/editor?image=${encodeURIComponent(img)}`)}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
              <Button disabled={varyingImage === img} size="sm" variant="secondary" className="h-8 text-xs gap-1 bg-card/90 backdrop-blur-sm hover:bg-card" onClick={() => handleVariations(img)}>
                {varyingImage === img ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3" />} Variations
              </Button>
            </div>
          </div>
          <div className="px-3 pb-3">
             {status === "completed" && <ToolImprovementSummary tool="product_fix" />}
          </div>
        </motion.div>
      ))}
      <CompareModal 
        isOpen={!!comparingImage} 
        onClose={() => setComparingImage(null)} 
        originalImage={comparingImage?.original || ''} 
        resultImage={comparingImage?.result || ''} 
        toolLabel={comparingImage?.tool} 
      />
    </div>
  );
});
