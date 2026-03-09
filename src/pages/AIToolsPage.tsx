import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Wand2, Eraser, Square, ZoomIn, ArrowUpFromLine, Upload, Download, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { uploadProduct, callImageTool } from "@/lib/api";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  creditCost: number;
}

const tools: Tool[] = [
  { id: "remove_bg", name: "Remove Background", description: "Remove background from product photos instantly. Perfect for ecommerce listings.", icon: Eraser, creditCost: 1 },
  { id: "white-bg", name: "White Background", description: "Replace any background with a clean white backdrop. Amazon & marketplace ready.", icon: Square, creditCost: 1 },
  { id: "upscale", name: "Super Resolution", description: "Enhance image quality and resolution up to 4x. Make every detail crisp and clear.", icon: ZoomIn, creditCost: 2 },
  { id: "upscale-v4", name: "Upscale v4", description: "AI-powered upscaling with detail preservation. Best for print and large format.", icon: ArrowUpFromLine, creditCost: 4 },
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ url: string, id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const { product_id, image_url } = await uploadProduct(file, file.name.split('.')[0]);
        setUploadedImage({ url: image_url, id: product_id });
        setResultReady(false);
      } catch (err) {
        console.error("Upload failed", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleProcess = async () => {
    if (!activeTool || !uploadedImage) return;
    setProcessing(true);

    try {
      if (activeTool.id === 'remove_bg' || activeTool.id === 'upscale') {
        await callImageTool(uploadedImage.url, activeTool.id);
        alert(`${activeTool.name} job started! Check the Generations page for progress.`);
      } else {
        // Mock delay for unsupported ones in this iteration
        await new Promise((r) => setTimeout(r, 2000));
        setResultReady(true);
        setSliderValue([50]);
      }
    } catch (err) {
      console.error(`Failed to process ${activeTool.id}`, err);
    } finally {
      setProcessing(false);
      if (activeTool.id === 'remove_bg' || activeTool.id === 'upscale') {
        handleClose(); // just close the modal since it polls asynchronously on the backend usually
      }
    }
  };

  const handleClose = () => { setActiveTool(null); setUploadedImage(null); setResultReady(false); setProcessing(false); };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">AI Image Tools</h1>
        </div>
        <p className="text-sm text-muted-foreground">Enhance your product images with powerful AI tools</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
            className="rounded-xl border border-border bg-card shadow-soft p-6 flex flex-col gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <tool.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{tool.description}</p>
                <span className="inline-block mt-2 text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full">
                  +{tool.creditCost} credit{tool.creditCost > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setActiveTool(tool)}>
              <Upload className="h-4 w-4 mr-2" /> Upload Image
            </Button>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!activeTool} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeTool && <activeTool.icon className="h-5 w-5 text-primary" />}
              {activeTool?.name}
            </DialogTitle>
          </DialogHeader>

          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p>Uploading image...</p>
            </div>
          ) : !uploadedImage ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/40 transition-colors bg-secondary/30">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Upload product image</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or browse</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              {!resultReady ? (
                <div className="rounded-lg border border-border overflow-hidden aspect-video bg-secondary/30 flex justify-center items-center">
                  <img src={uploadedImage.url} alt="Original" className={`w-full h-full object-cover transition-opacity ${processing ? 'opacity-50' : 'opacity-100'}`} />
                </div>
              ) : (
                /* Before / After Comparison Slider */
                <div className="space-y-3">
                  <div className="relative rounded-lg border border-border overflow-hidden aspect-video select-none">
                    {/* After (full) */}
                    <img src={uploadedImage.url} alt="After" className="absolute inset-0 w-full h-full object-cover brightness-110 contrast-105" />
                    {/* Before (clipped) */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${sliderValue[0]}%` }}
                    >
                      <img src={uploadedImage.url} alt="Before" className="w-full h-full object-cover" style={{ width: `${10000 / sliderValue[0]}%`, maxWidth: "none" }} />
                    </div>
                    {/* Divider line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary-foreground/80 shadow-lg z-10"
                      style={{ left: `${sliderValue[0]}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-card border-2 border-primary flex items-center justify-center shadow-md">
                        <ArrowRight className="h-3 w-3 text-primary rotate-180" />
                      </div>
                    </div>
                    {/* Labels */}
                    <span className="absolute top-3 left-3 text-xs font-medium bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-foreground z-10">Before</span>
                    <span className="absolute top-3 right-3 text-xs font-medium bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded-md text-foreground z-10">After</span>
                  </div>
                  <Slider value={sliderValue} onValueChange={setSliderValue} min={5} max={95} step={1} className="w-full" />
                </div>
              )}
              <div className="flex gap-3">
                {!resultReady ? (
                  <Button onClick={handleProcess} disabled={processing} className="flex-1 gradient-primary text-primary-foreground">
                    {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                    {processing ? "Processing…" : `Process (${activeTool?.creditCost} credits)`}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => {
                      const link = document.createElement('a');
                      link.href = uploadedImage.url;
                      link.download = `tool-result.png`;
                      link.click();
                    }}>
                      <Download className="h-4 w-4 mr-2" /> Download
                    </Button>
                    <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => window.location.href = `/editor?image=${encodeURIComponent(uploadedImage.url)}`}>
                      <ArrowRight className="h-4 w-4 mr-2" /> Edit Result
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
