import { useState, useRef } from "react";
import { Link } from "react-router-dom";
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
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { uploadProduct, callImageTool } from "@/lib/api";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("No image loaded");
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, WEBP).", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedImage(url);
    setFileName(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleApply = async () => {
    if (!activeTool || !selectedFile) return;

    setProcessing(true);
    setProgress(15);

    try {
      // 1. Upload local file to Supabase first if needed
      setProgress(40);
      const { image_url } = await uploadProduct(selectedFile, selectedFile.name);

      // 2. Transmit to AI worker API
      setProgress(75);
      await callImageTool(image_url, activeTool as any);

      setProgress(100);
      toast({
        title: "Processing Image",
        description: "Your image is being edited by the AI. Check generations panel shortly.",
      });

      // Simulating visual finish
      setTimeout(() => setProcessing(false), 800);

    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message || "Could not process image.",
        variant: "destructive"
      });
      setProcessing(false);
      setProgress(0);
    }
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeTool === tool.id
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
            disabled={!activeTool || processing || !selectedImage}
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
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={handleImportClick} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Image
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2 max-w-[200px]">
              <Layers className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-foreground font-medium truncate">{fileName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!selectedImage}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">100%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!selectedImage}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!selectedImage}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div
          className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed rounded-xl m-4">
              <div className="flex flex-col items-center gap-4 bg-background/80 p-8 rounded-2xl shadow-xl">
                <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center animate-bounce">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Drop image here</h3>
                <p className="text-sm text-muted-foreground">Release to load into editor</p>
              </div>
            </div>
          )}
          <AnimatePresence mode="wait">
            {!selectedImage ? (
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleImportClick}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Browse Files
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    asChild
                  >
                    <Link to="/dashboard/assets">
                      <ImageIcon className="h-4 w-4" />
                      Select From Assets
                    </Link>
                  </Button>
                </div>
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
                  src={selectedImage}
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
