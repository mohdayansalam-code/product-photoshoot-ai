import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { motion } from "framer-motion";
import { Wand2, Eraser, Square, ZoomIn, ArrowUpFromLine, Upload, Download, ArrowRight, Loader2, Wrench, Smile } from "lucide-react";
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
  { id: "remove-background", name: "Remove Background", description: "Remove background from product photos instantly. Perfect for ecommerce listings.", icon: Eraser, creditCost: 1 },
  { id: "white-background", name: "White Background", description: "Replace any background with a clean white backdrop. Amazon & marketplace ready.", icon: Square, creditCost: 1 },
  { id: "super-resolution", name: "Super Resolution", description: "Enhance image quality and resolution up to 4x. Make every detail crisp and clear.", icon: ZoomIn, creditCost: 2 },
  { id: "upscale", name: "Upscale", description: "AI-powered upscaling with detail preservation. Best for print and large format.", icon: ArrowUpFromLine, creditCost: 4 },
  { id: "product-fix", name: "Product Fix", description: "Fix label clarity, packaging defects and product distortions. Ideal for cosmetics and jewelry.", icon: Wrench, creditCost: 3 },
  { id: "face-correct", name: "Face Correction", description: "Improve facial details and remove AI artifacts. Ideal for fashion images.", icon: Smile, creditCost: 2 },
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [uploadedImage, setUploadedImage] = useState<{ url: string, id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [errorState, setErrorState] = useState<{ type: 'upload' | 'process', message: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleUpload = async (e?: React.ChangeEvent<HTMLInputElement> | null, retryFile?: File) => {
    const file = retryFile || e?.target.files?.[0];
    if (file) {
      if (retryFile) setIsRetrying(true);
      else setIsUploading(true);
      
      setErrorState(null);
      try {
        const { product_id, image_url } = await uploadProduct(file, file.name.split('.')[0]);
        setUploadedImage({ url: image_url, id: product_id });
        setResultReady(false);
      } catch (err: any) {
        console.error("Upload failed");
        setErrorState({ type: 'upload', message: "Upload failed. Retry." });
      } finally {
        setIsUploading(false);
        setIsRetrying(false);
      }
    }
  };

  const handleProcess = async (isRetry = false) => {
    if (!activeTool || !uploadedImage) return;
    
    if (isRetry) setIsRetrying(true);
    else setProcessing(true);

    setErrorState(null);

    try {
        await callImageTool(uploadedImage.url, activeTool.id);
        alert(`${activeTool.name} job started! Check the Generations page for progress.`);
        handleClose();
    } catch (err: any) {
      console.error(`Failed to process ${activeTool.id}`);
      setErrorState({ type: 'process', message: "Tool failed. Try again." });
    } finally {
      setProcessing(false);
      setIsRetrying(false);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

          {errorState ? (
            <div className="py-12 px-6">
              <ErrorState 
                message={errorState.message}
                onRetry={() => errorState.type === 'upload' ? handleUpload(null) : handleProcess(true)}
                retrying={isRetrying}
              />
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
              <p>Uploading image...</p>
            </div>
          ) : !uploadedImage ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/40 transition-colors bg-secondary/30">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Upload product image</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or browse</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading || processing} />
            </label>
          ) : (
            <div className="space-y-4">
              {!resultReady ? (
                <div className="rounded-lg border border-border overflow-hidden aspect-video bg-secondary/30 flex justify-center items-center">
                   {processing ? (
                       <div className="flex flex-col items-center gap-3">
                         <Loader2 className="h-10 w-10 text-primary animate-spin" />
                         <p className="text-foreground font-medium">Processing image...</p>
                       </div>
                   ) : (
                       <img src={uploadedImage.url} alt="Original" className="w-full h-full object-cover" />
                   )}
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
                  <Button onClick={() => handleProcess()} disabled={processing} className="flex-1 gradient-primary text-primary-foreground">
                    {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : < Wand2 className="h-4 w-4 mr-2" />}
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
