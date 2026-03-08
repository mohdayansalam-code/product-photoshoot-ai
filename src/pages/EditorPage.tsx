import { useState } from "react";
import {
  Eraser,
  Square,
  Maximize,
  ArrowUp,
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Download,
  Undo,
  Redo,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

const TOOLS = [
  { id: "remove_bg", label: "Remove BG", icon: Eraser, credits: 1 },
  { id: "white_bg", label: "White BG", icon: Square, credits: 1 },
  { id: "super_res", label: "Super Res", icon: Maximize, credits: 2 },
  { id: "upscale", label: "Upscale v4", icon: ArrowUp, credits: 4 },
  { id: "crop", label: "Crop", icon: Crop, credits: 0 },
  { id: "rotate", label: "Rotate", icon: RotateCw, credits: 0 },
];

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleApply = () => {
    setProcessing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setProcessing(false);
          return 100;
        }
        return p + 20;
      });
    }, 400);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Tools Panel */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[220px] border-r border-border bg-card flex flex-col flex-shrink-0"
      >
        <div className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">Editor Tools</h2>
          <p className="text-xs text-muted-foreground">Select a tool to edit</p>
        </div>
        <Separator />
        <div className="p-3 space-y-1 flex-1">
          {TOOLS.map((tool) => (
            <motion.button
              key={tool.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTool === tool.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <tool.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{tool.label}</span>
              {tool.credits > 0 && (
                <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {tool.credits}cr
                </span>
              )}
            </motion.button>
          ))}
        </div>
        <Separator />
        <div className="p-3 space-y-1">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Separator />
        <div className="p-3">
          <Button
            onClick={handleApply}
            disabled={!activeTool || processing}
            className="w-full gradient-primary text-primary-foreground font-medium text-sm"
          >
            {processing ? "Processing..." : "Apply"}
          </Button>
          {processing && <Progress value={progress} className="mt-2 h-1.5" />}
        </div>
      </motion.aside>

      {/* Canvas Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex-1 flex flex-col bg-secondary/30"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">product_photo.png</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">100%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {!imageLoaded ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center space-y-4"
              >
                <div className="h-48 w-48 mx-auto rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <Layers className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No image loaded</p>
                  <p className="text-sm text-muted-foreground">Upload an image or select from your assets</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setImageLoaded(true)}
                >
                  Load Sample Image
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="canvas"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden shadow-elevated border border-border bg-card"
              >
                {processing && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Skeleton className="h-6 w-32 mx-auto" />
                      <p className="text-sm text-muted-foreground">Applying {activeTool}...</p>
                    </div>
                  </div>
                )}
                <img
                  src="/placeholder.svg"
                  alt="Editor canvas"
                  className="w-[500px] h-[500px] object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
