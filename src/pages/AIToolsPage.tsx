import { useState, useCallback } from "react";
import { Wand2, Eraser, Square, ZoomIn, ArrowUpFromLine, Upload, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  creditCost: number;
}

const tools: Tool[] = [
  {
    id: "remove-bg",
    name: "Remove Background",
    description: "Remove background from product photos instantly. Perfect for ecommerce listings.",
    icon: Eraser,
    creditCost: 1,
  },
  {
    id: "white-bg",
    name: "White Background",
    description: "Replace any background with a clean white backdrop. Amazon & marketplace ready.",
    icon: Square,
    creditCost: 1,
  },
  {
    id: "super-resolution",
    name: "Super Resolution",
    description: "Enhance image quality and resolution up to 4x. Make every detail crisp and clear.",
    icon: ZoomIn,
    creditCost: 2,
  },
  {
    id: "upscale-v4",
    name: "Upscale v4",
    description: "AI-powered upscaling with detail preservation. Best for print and large format.",
    icon: ArrowUpFromLine,
    creditCost: 4,
  },
];

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setResultReady(false);
    }
  }, []);

  const handleProcess = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setProcessing(false);
    setResultReady(true);
  };

  const handleClose = () => {
    setActiveTool(null);
    setUploadedImage(null);
    setResultReady(false);
    setProcessing(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wand2 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">AI Image Tools</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Enhance your product images with powerful AI tools
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {tools.map((tool) => (
          <div
            key={tool.id}
            className="rounded-xl border border-border bg-card shadow-soft p-6 flex flex-col gap-4 hover:shadow-card transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                <tool.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {tool.description}
                </p>
                <span className="inline-block mt-2 text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full">
                  +{tool.creditCost} credit{tool.creditCost > 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActiveTool(tool)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
          </div>
        ))}
      </div>

      {/* Tool Dialog */}
      <Dialog open={!!activeTool} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeTool && <activeTool.icon className="h-5 w-5 text-primary" />}
              {activeTool?.name}
            </DialogTitle>
          </DialogHeader>

          {!uploadedImage ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/40 transition-colors bg-secondary/30">
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">Upload product image</p>
              <p className="text-xs text-muted-foreground mt-1">Drag & drop or browse</p>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              {/* Before / After */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Before</p>
                  <div className="rounded-lg border border-border overflow-hidden aspect-square bg-secondary/30">
                    <img src={uploadedImage} alt="Original" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">After</p>
                  <div className="rounded-lg border border-border overflow-hidden aspect-square bg-secondary/30 flex items-center justify-center">
                    {processing ? (
                      <div className="text-center">
                        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Processing…</p>
                      </div>
                    ) : resultReady ? (
                      <img src={uploadedImage} alt="Result" className="w-full h-full object-cover opacity-90" />
                    ) : (
                      <p className="text-sm text-muted-foreground">Click process to start</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {!resultReady ? (
                  <Button onClick={handleProcess} disabled={processing} className="flex-1 gradient-primary text-primary-foreground">
                    <Wand2 className="h-4 w-4 mr-2" />
                    {processing ? "Processing…" : `Process (${activeTool?.creditCost} credits)`}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button className="flex-1 gradient-primary text-primary-foreground">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Use in Photoshoot
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
