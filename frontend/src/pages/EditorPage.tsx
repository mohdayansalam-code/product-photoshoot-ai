import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Crop,
  RotateCw,
  Download,
  Upload,
  Image as ImageIcon,
  Check,
  Save,
  Trash,
  Undo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { uploadAsset } from "@/lib/api";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

export default function EditorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Core Image States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("No image loaded");
  const [lastImageState, setLastImageState] = useState<string | null>(null);
  
  // UX States
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Active Local Tool (crop/move)
  const [dragMode, setDragMode] = useState<"crop" | "move">("move");

  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const defaultImage = searchParams.get("image");
    if (defaultImage && !selectedImage) {
      setSelectedImage(defaultImage);
      setFileName("Asset Loaded");
    }
  }, [searchParams]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    
    // Auto-apply current changes if any exist before switching the image entirely
    if (hasChanges && selectedImage) {
      handleApply();
    }
    
    try {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setFileName(file.name);
      setLastImageState(null);
      setHasChanges(false);
      setDragMode("move");
    } catch (err) {
      toast({ title: "Load error", description: "Could not load image securely.", variant: "destructive" });
    }
  };

  const handleApply = async () => {
    if (!selectedImage || !hasChanges) return;

    setIsApplying(true);
    // Give UI a tiny breathing frame
    await new Promise(r => setTimeout(r, 100));

    try {
      const cropper = cropperRef.current?.cropper;
      if (!cropper) throw new Error("Editor not ready");

      const canvas = cropper.getCroppedCanvas();
      if (!canvas) throw new Error("Empty canvas result");
      
      const modifiedImage = canvas.toDataURL("image/png");
      
      // Store 1-step undo
      setLastImageState(selectedImage);
      
      // Update preview to fixed state
      setSelectedImage(modifiedImage);
      setHasChanges(false);
      setDragMode("move"); // Reset tool
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const handleUndo = () => {
    if (lastImageState) {
      setSelectedImage(lastImageState);
      setLastImageState(null); // Used the 1 step
      setHasChanges(false);
    }
  };

  const handleRotate = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    
    // Rotate instantly
    cropper.rotate(90);
    setHasChanges(true);
  };

  const onCropEnd = () => {
    // Only detect if bounding box actually exists / moved
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const data = cropper.getData();
      // If we cropped something non-trivial, mark changes
      if (data.width > 0 && data.height > 0) {
        setHasChanges(true);
      }
    }
  };

  const switchTool = (mode: "crop" | "move") => {
    if (hasChanges && mode === "move" && dragMode === "crop") {
       // If disabling crop, auto apply the crop logic 
       handleApply();
    }
    
    setDragMode(mode);
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.setDragMode(mode);
  };

  const handleSaveToAssets = async () => {
    if (!selectedImage) return;
    setSaving(true);

    try {
      // Auto-apply safety if user missed hitting "Apply"
      if (hasChanges) {
         await handleApply();
      }

      // 1. Fetch exact blob from current state
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      if (!blob) throw new Error("Could not construct image blob.");

      // 2. Upload securely using existing product-images logic
      const { asset_url } = await uploadAsset(blob);
      if (!asset_url) throw new Error("Save failed. Try again.");

      toast({
        title: "Saved to Assets",
        description: "Your edited image has been saved to your library.",
      });

      navigate("/dashboard/assets");

    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Save failed. Try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleDownload = () => {
      // Auto apply if needed
      if (hasChanges) handleApply();

      const link = document.createElement('a');
      link.href = selectedImage || "";
      link.download = `edited-${Date.now()}.png`;
      link.click();
      toast({ title: "Download started" });
  };

  const isBusy = saving || isApplying;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Minimal Tools Panel */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-[240px] border-r border-border bg-card flex flex-col flex-shrink-0"
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-1">Editor Tools</h2>
          <p className="text-xs text-muted-foreground">Minimal stable workflows</p>
        </div>
        
        {/* Core Local Tools */}
        <div className="p-3">
          <div className="flex justify-start mb-2">
            {lastImageState && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleUndo} 
                disabled={isBusy}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                <Undo className="h-3 w-3 mr-1" /> Undo
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <Button 
               variant={dragMode === "crop" ? "default" : "secondary"} 
               size="sm" 
               onClick={() => switchTool("crop")} 
               disabled={!selectedImage || isBusy}
            >
              <Crop className="h-3.5 w-3.5 mr-1" /> Crop
            </Button>
            <Button 
               variant="secondary" 
               size="sm" 
               onClick={handleRotate} 
               disabled={!selectedImage || isBusy}
            >
              <RotateCw className="h-3.5 w-3.5 mr-1" /> Rotate
            </Button>
          </div>
        </div>

        <Separator />
        
        <div className="p-3 space-y-2 mt-auto">
          <Button
            onClick={handleApply}
            disabled={!selectedImage || !hasChanges || isBusy}
            variant="outline"
            className="w-full font-medium text-sm text-foreground mb-4"
          >
            {isApplying ? "Applying..." : <><Check className="h-4 w-4 mr-2" /> Apply Changes</>}
          </Button>

          <Button
            onClick={handleSaveToAssets}
            disabled={!selectedImage || isBusy}
            className="w-full gradient-primary text-primary-foreground font-medium text-sm gap-2"
          >
            {saving ? "Saving..." : <><Save className="h-4 w-4" /> Save to Assets</>}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={!selectedImage || isBusy}
            variant="secondary"
            className="w-full gap-2 text-sm"
          >
            <Download className="h-4 w-4" /> Download
          </Button>
        </div>
      </motion.aside>

      {/* Canvas Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex-1 flex flex-col bg-secondary/30"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) handleFile(file);
              }}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              disabled={isBusy}
            />
            
            <Button size="sm" onClick={handleImportClick} disabled={isBusy} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Image
            </Button>
            
            {selectedImage && (
              <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={() => {
                   setSelectedImage(null);
                   setHasChanges(false);
                   setLastImageState(null);
                 }} 
                 disabled={isBusy}
                 className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash className="h-4 w-4" /> Clear
              </Button>
            )}
            
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm text-foreground font-medium truncate max-w-[200px]">{fileName}</span>
          </div>
          
          {hasChanges && (
            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full animate-pulse">
              Unsaved changes
            </span>
          )}
        </div>

        <div
          className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => { 
             e.preventDefault(); 
             setIsDragging(false); 
             const file = e.dataTransfer.files?.[0];
             if (file && !isBusy) handleFile(file);
          }}
        >
          {isDragging && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-primary/10 backdrop-blur-sm border-2 border-primary border-dashed rounded-xl m-4">
              <div className="flex flex-col items-center gap-4 bg-background/90 p-8 rounded-2xl shadow-xl">
                <Upload className="h-10 w-10 text-primary animate-bounce" />
                <h3 className="text-xl font-bold text-foreground">Drop image here</h3>
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
                  <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No image loaded</p>
                  <p className="text-sm text-muted-foreground">Import an image from your computer to start editing</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="canvas"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-xl overflow-hidden shadow-elevated border border-border bg-black/5 flex items-center justify-center w-full aspect-square max-w-4xl max-h-[75vh]"
              >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="relative w-full h-full">
                      <Cropper
                        ref={cropperRef}
                        src={selectedImage}
                        style={{ height: "100%", width: "100%" }}
                        initialAspectRatio={NaN}
                        guides={dragMode === "crop"}
                        dragMode={dragMode}
                        viewMode={1}
                        responsive={true}
                        autoCropArea={1}
                        background={false}
                        checkOrientation={false}
                        cropend={onCropEnd}
                        zoom={() => setHasChanges(true)}
                        center={true}
                      />
                    </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
