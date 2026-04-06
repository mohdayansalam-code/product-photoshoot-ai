import { useState } from "react";
import { Camera, Check, Sparkles, Package, ShieldAlert, Wand2, Hammer } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useProductStore } from "@/lib/productStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type ToolType = "photoshoot" | "upscale" | "remove_bg";

const TOOLS = [
  { id: "photoshoot", label: "AI Product Photoshoot", icon: Camera, isAI: true },
  { id: "upscale", label: "AI Upscaler", icon: Wand2, isAI: true },
  { id: "remove_bg", label: "Background Remover", icon: Hammer, isAI: true },
] as const;

export default function GeneratePage() {
  const { products } = useProductStore();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolType>("photoshoot");
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    // Safety disable button momentarily to avoid spam
    setIsGenerating(true);
    
    try {
      // Artificially simulate generation spin for UX stability test
      await new Promise((resolve) => setTimeout(resolve, 800));

      const activeTool = TOOLS.find(t => t.id === selectedTool);
      
      if (activeTool?.isAI) {
        toast({
          title: "Setup Required",
          description: "AI generation not enabled yet.",
        });
      } else {
         toast({
          title: "Generation unavailable",
          description: "This feature is currently offline.",
          variant: "destructive"
        });
      }

    } catch (err: any) {
      toast({
        title: "Action failed",
        description: "Generation unavailable",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonState = () => {
    if (!selectedProductId) return { text: "Select a product", disabled: true };
    if (isGenerating) return { text: "Processing...", disabled: true };
    return { text: "Generate", disabled: false };
  };

  const { text: buttonText, disabled: buttonDisabled } = getButtonState();

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-3.5rem)]">
      {/* Configuration Sidebar */}
      <ScrollArea className="w-full lg:w-[420px] border-b lg:border-r border-border flex-shrink-0 bg-card">
        <motion.div
           initial={{ opacity: 0, x: -12 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.4 }}
           className="p-6 space-y-6"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Generation Tools</h1>
          </div>

          {/* 1. Product Selection */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">1. Select Product</h2>
            </div>
            
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-xl bg-secondary/20 text-center space-y-3">
                 <Package className="h-8 w-8 text-muted-foreground/60" />
                 <span className="text-sm font-medium text-foreground">Upload a product first</span>
                 <Button onClick={() => navigate("/dashboard/products")} variant="outline" size="sm" className="w-full">
                    Go to Products
                 </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {products.slice(0, 9).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={cn(
                      "relative rounded-lg border overflow-hidden aspect-square transition-all",
                      selectedProductId === p.id
                        ? "border-primary ring-2 ring-primary/30 shadow-md"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    {selectedProductId === p.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                        <Check className="h-5 w-5 text-primary-foreground drop-shadow-md" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 2. Tool Selection */}
          <section className="space-y-3">
             <div className="flex justify-between items-center">
                 <h2 className="text-sm font-medium text-foreground">2. Select Tool</h2>
                 <span className="text-[10px] font-semibold tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                   AI tools coming soon
                 </span>
             </div>
             <div className="flex flex-col gap-2">
                 {TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id as ToolType)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all text-left",
                        selectedTool === tool.id 
                           ? "bg-primary/5 border-primary text-foreground ring-1 ring-primary/20"
                           : "bg-background border-border text-muted-foreground hover:bg-secondary/30",
                           // Visually distinct for disabled AI tools if needed
                           tool.isAI ? "opacity-70" : ""
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-md", 
                        selectedTool === tool.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      )}>
                        <tool.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                         <p>{tool.label}</p>
                      </div>
                    </button>
                 ))}
             </div>
          </section>

          {/* Action Footer */}
          <div className="pt-2">
             <Button
                onClick={handleGenerate}
                disabled={buttonDisabled}
                className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-md transition-all hover:opacity-90"
             >
                {isGenerating ? (
                   "Processing..."
                ) : (
                   <>{selectedProductId ? <Sparkles className="h-4 w-4 mr-2" /> : null} {buttonText}</>
                )}
             </Button>
          </div>
        </motion.div>
      </ScrollArea>

      {/* Main Canvas Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col items-center justify-center bg-secondary/30 p-6 overveflow-hidden"
      >
          {selectedProductId ? (
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-8 w-8 text-primary" />
                 </div>
                 <h3 className="text-xl font-medium text-foreground">Ready to create</h3>
                 <p className="text-muted-foreground text-sm max-w-sm">
                    Select a tool from the left panel and click {selectedProductId ? "Generate" : "Select a product"} to start.
                 </p>
              </div>
          ) : (
              <div className="flex flex-col items-center gap-4 text-center opacity-40">
                 <ShieldAlert className="h-16 w-16 text-muted-foreground" />
                 <h3 className="text-lg font-medium text-foreground">No target selected</h3>
                 <p className="text-muted-foreground text-sm">Please select a product from your library.</p>
               </div>
          )}
      </motion.div>
    </div>
  );
}
