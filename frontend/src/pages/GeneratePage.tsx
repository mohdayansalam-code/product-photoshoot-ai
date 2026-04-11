import { useState } from "react";
import { Camera, Check, Sparkles, Package, ShieldAlert, Image as ImageIcon, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useProductStore } from "@/lib/productStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { MODEL_COST } from "@/utils/modelCosts";
import { SCENES, generateProduct } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast as sonnerToast } from "sonner";

const PROMPT_PRESETS = ["Luxury", "Minimal", "Studio", "Beauty", "Fashion", "Dark"];

const MODELS = [
  { id: "flux", name: "Flux 2 Pro", description: "Fast & high quality", cost: MODEL_COST.flux, badge: "Recommended" },
  { id: "seedream45", name: "Seedream 4.5", description: "Standard generation", cost: MODEL_COST.seedream45 },
  { id: "seedreamLite", name: "Seedream 5 Lite", description: "Balanced performance", cost: MODEL_COST.seedreamLite },
  { id: "gemini", name: "Gemini 3.1", description: "Premium quality", cost: MODEL_COST.gemini },
];

const UploadBox = ({ label, onUpload, value }: { label: string, onUpload: (file: File | null) => void, value: File | null }) => {
  return (
    <div className="relative w-full">
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-colors bg-secondary/10 relative overflow-hidden w-full h-full min-h-[100px]">
        {value ? (
          <div className="absolute inset-0 z-10 font-bold flex flex-col justify-center items-center bg-card">
             <img src={URL.createObjectURL(value)} alt="Preview" className="w-full h-full object-cover opacity-60" />
             <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white text-[10px] p-1.5 rounded backdrop-blur text-center leading-tight">
               <div className="truncate">{value.name}</div>
               <div className="text-white/70">{(value.size / (1024 * 1024)).toFixed(2)} MB</div>
             </div>
          </div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-xs font-medium text-foreground">{label}</span>
          </>
        )}
        <input type="file" accept="image/jpeg, image/jpg, image/png, image/webp" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (!file.type.startsWith("image") || file.type.includes("svg") || file.type.includes("gif") || file.type.includes("bmp")) {
              sonnerToast.error("Upload image only (jpg, png, webp)");
              return;
            }
            if (file.size > 10000000) {
              sonnerToast.error("Max file size 10MB");
              return;
            }
            onUpload(file);
          }
        }} />
      </label>
      {value && (
         <button onClick={(e) => { e.preventDefault(); onUpload(null); }} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 z-20 shadow-md hover:scale-110 transition-transform">
           <X className="h-3 w-3" />
         </button>
      )}
    </div>
  );
};

export default function GeneratePage() {
  const { products } = useProductStore();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [uploadedProduct, setUploadedProduct] = useState<File | null>(null);
  const [modelImage, setModelImage] = useState<File | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("flux");
  const [imageCount, setImageCount] = useState<number>(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGenerate = async () => {
    const productImage = uploadedProduct || selectedProductId;
    if (isGenerating) return;
    if (!productImage) {
      sonnerToast.error("Upload or select a product");
      return;
    }
    
    setIsGenerating(true);
    const costCredits = (MODEL_COST[selectedModel as keyof typeof MODEL_COST] * imageCount) / 10;
    
    try {
       const { data: sessionData } = await supabase.auth.getSession();
       if (!sessionData?.session) return;
       
       const res = await fetch("/api/credits", {
         headers: {
           Authorization: `Bearer ${sessionData.session.access_token}`
         }
       });
       const userCredits = await res.json();

       if (userCredits.credits_remaining < costCredits) {
          sonnerToast.error("Not enough credits");
          setIsGenerating(false);
          return;
       }
       let generationType = "product";
       if (modelImage && backgroundImage) {
         generationType = "campaign";
       } else if (modelImage) {
         generationType = "fashion";
       } else if (backgroundImage) {
         generationType = "lifestyle";
       }

       let productUrl;
       if (selectedProductId && !uploadedProduct) {
         const product = products.find(p => p.id === selectedProductId);
         if (!product) throw new Error("Product not found");
         productUrl = product.imageUrl;
       }

       sonnerToast.promise(
         generateProduct({
           product_image: uploadedProduct,
           product_url: productUrl,
           background_image: backgroundImage,
           model_image: modelImage,
           user_prompt: prompt,
           generation_type: generationType,
           scene: selectedScene || undefined,
           ai_model: selectedModel,
           image_count: imageCount,
           enhancements: [] // no enhancement allowed here
         }),
         {
           loading: `Generating images...`,
           success: (data) => {
             setTimeout(() => {
                navigate(`/dashboard/generations?job=${data.job_id}`);
             }, 2000);
             return "Generation started successfully";
           },
           error: "Generation failed. Try again."
         }
       );
    } catch (err: any) {
       sonnerToast.error("Generation failed. Try again.");
    } finally {
       setIsGenerating(false);
    }
  };

  const getButtonState = () => {
    if (isGenerating) return { text: "Generating...", disabled: true };
    const productImage = uploadedProduct || selectedProductId;
    if (!productImage) return { text: "Upload product first", disabled: true };
    return { text: "Generate Photoshoot", disabled: false };
  };

  const { text: buttonText, disabled: buttonDisabled } = getButtonState();
  const totalCost = (MODEL_COST[selectedModel as keyof typeof MODEL_COST] * imageCount) / 10;

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-3.5rem)]">
      {/* Configuration Sidebar */}
      <ScrollArea className="w-full lg:w-[480px] border-b lg:border-r border-border flex-shrink-0 bg-card">
        <motion.div
           initial={{ opacity: 0, x: -12 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.4 }}
           className="p-6 space-y-8"
        >
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Generate Photoshoot</h1>
          </div>

          {/* 1. Product Selection */}
          <section className="space-y-3">
             <div className="flex items-center justify-between">
               <h2 className="text-sm font-medium text-foreground">1. Product (Required)</h2>
             </div>
             <p className="text-xs text-muted-foreground">Upload a new product or select an existing one</p>
             
             <UploadBox label="Product reference" onUpload={(file) => {
                setUploadedProduct(file);
                if(file) setSelectedProductId(null);
             }} value={uploadedProduct} />
             
             {products.length > 0 && (
                <>
                  <div className="flex items-center gap-2 my-2">
                     <div className="h-px bg-border flex-1"></div>
                     <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">OR</span>
                     <div className="h-px bg-border flex-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {products.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                           setSelectedProductId(p.id);
                           setUploadedProduct(null);
                        }}
                        className={cn(
                          "relative rounded-lg border overflow-hidden aspect-square transition-all",
                          selectedProductId === p.id && !uploadedProduct
                            ? "border-primary ring-2 ring-primary/30 shadow-md"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        {selectedProductId === p.id && !uploadedProduct && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                            <Check className="h-5 w-5 text-primary-foreground drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
             )}
          </section>

          {/* 2. Model / Face */}
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">2. Model (optional)</h2>
             </div>
             <p className="text-xs text-muted-foreground">Upload model reference for fashion shoots</p>
             <UploadBox label="Model reference" onUpload={setModelImage} value={modelImage} />
          </section>

          {/* 3. Background */}
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">3. Background (optional)</h2>
             </div>
             <p className="text-xs text-muted-foreground">Upload custom scene background</p>
             
             <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
                 <UploadBox label="Background reference" onUpload={setBackgroundImage} value={backgroundImage} />
                 <span className="text-xs text-muted-foreground px-1">or</span>
                 <div className="flex bg-secondary/30 rounded-xl items-center justify-center p-4 border border-dashed border-transparent">
                     <span className="text-xs text-muted-foreground text-center">choose preset</span>
                 </div>
             </div>

             <div className="pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {SCENES.slice(0, 3).map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => {
                        setSelectedScene(scene.id);
                        setPrompt(scene.name);
                        setBackgroundImage(null); // clear uploaded file
                      }}
                       className={cn(
                         "relative rounded-lg border overflow-hidden aspect-video transition-all group",
                         selectedScene === scene.id
                           ? "border-primary ring-1 ring-primary/30 shadow-sm"
                           : "border-border opacity-70 hover:opacity-100"
                       )}
                    >
                      <img src={scene.thumbnail} alt={scene.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px] text-white truncate text-center">
                        {scene.name}
                      </div>
                      {selectedScene === scene.id && (
                        <div className="absolute top-0.5 right-0.5 bg-primary/80 rounded-full p-0.5">
                           <Check className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
             </div>
          </section>

          {/* 4. Describe */}
          <section className="space-y-3">
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-foreground">4. Describe photoshoot</h2>
                <Button variant="outline" size="sm" className="h-7 text-xs border-primary/20 text-primary hover:bg-primary/5" onClick={() => {}}>
                  Enhance prompt with AI (coming soon)
                </Button>
             </div>
             <Textarea 
                placeholder="Describe the desired background, lighting, and mood... (e.g. A sleek bottle on a marble podium with dramatic studio lighting)" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="resize-none h-20 text-sm"
             />
             <div className="flex flex-wrap gap-2 pt-1">
                {PROMPT_PRESETS.map((preset) => (
                   <button
                     key={preset}
                     onClick={() => setPrompt(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + preset.toLowerCase())}
                     className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-secondary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                   >
                     {preset}
                   </button>
                ))}
             </div>
          </section>

          {/* 5. AI Model */}
          <section className="space-y-3">
             <h2 className="text-sm font-medium text-foreground">5. AI Model</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={cn(
                        "relative p-3 rounded-xl border text-left transition-all",
                        selectedModel === model.id 
                           ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                           : "bg-card border-border hover:border-primary/40"
                      )}
                    >
                      {model.badge && (
                        <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {model.badge}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-foreground">{model.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                      <p className="text-xs font-medium text-primary mt-2 flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" /> {model.cost / 10} credits/img
                      </p>
                    </button>
                ))}
             </div>
          </section>

          {/* 6. Image Quantity */}
          <section className="space-y-3">
             <div className="flex justify-between items-center">
               <h2 className="text-sm font-medium text-foreground">6. Image Quantity</h2>
             </div>
             <div className="flex bg-secondary rounded-lg p-1">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setImageCount(num)}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                      imageCount === num 
                        ? "bg-background text-foreground shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {num}
                  </button>
                ))}
             </div>
          </section>

          {/* Action Footer */}
          <div className="pt-6 pb-2 border-t border-border mt-6">
              {/* 7. Cost Preview & 8. Generate Button */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-foreground font-medium">7. Cost Preview</span>
                <span className="text-sm font-semibold text-primary">
                  {MODELS.find(m => m.id === selectedModel)?.name} × {imageCount} = <span className="underline decoration-primary decoration-2 underline-offset-2">{totalCost} credits</span>
                </span>
              </div>
             
             <Button
                onClick={handleGenerate}
                disabled={buttonDisabled}
                className="w-full h-12 gradient-primary text-primary-foreground font-semibold shadow-md transition-all hover:opacity-90"
             >
                {isGenerating ? (
                   "Processing..."
                ) : (
                   <><Sparkles className="h-4 w-4 mr-2" /> {buttonText}</>
                )}
             </Button>

             {isGenerating && (
                <motion.div initial={{opacity: 0, y: -5}} animate={{opacity: 1, y: 0}} className="mt-4 flex flex-col items-center justify-center text-center space-y-1 animate-pulse">
                    <p className="text-sm font-medium text-foreground">Generation started</p>
                    <p className="text-xs text-muted-foreground">This usually takes 30–60 seconds.</p>
                </motion.div>
             )}
          </div>
        </motion.div>
      </ScrollArea>

      {/* Main Canvas Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="hidden lg:flex flex-1 flex-col items-center justify-center bg-secondary/30 p-6 overflow-hidden"
      >
          {selectedProductId ? (
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <ImageIcon className="h-10 w-10 text-primary opacity-80" />
                 </div>
                 <h3 className="text-xl font-medium text-foreground">Target specific</h3>
                 <p className="text-muted-foreground text-sm max-w-sm">
                    Model: {MODELS.find(m => m.id === selectedModel)?.name} <br/>
                    Prompt: "{prompt || 'A product photo'}"
                 </p>
              </div>
          ) : (
              <div className="flex flex-col items-center gap-4 text-center opacity-40">
                 <ShieldAlert className="h-16 w-16 text-muted-foreground" />
                 <h3 className="text-lg font-medium text-foreground">No product selected</h3>
                 <p className="text-muted-foreground text-sm">Please select a product from your library to begin.</p>
               </div>
          )}
      </motion.div>
    </div>
  );
}
