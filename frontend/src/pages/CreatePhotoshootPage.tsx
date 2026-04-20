import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  Camera, 
  Download, 
  Image as ImageIcon, 
  X, 
  RefreshCw,
  Layers,
  Sparkles,
  Focus,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateShoot, pollImage, DEFAULT_CREDITS } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const SHOOT_STYLES = [
  { id: "studio", name: "Studio", description: "Clean background, professional look", bgClass: "bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 border-neutral-300 dark:border-neutral-700" },
  { id: "outdoor", name: "Outdoor", description: "Natural lighting, lifestyle vibe", bgClass: "bg-gradient-to-br from-green-100/80 to-blue-100/80 dark:from-green-900/30 dark:to-blue-900/30 border-green-200 dark:border-green-800" },
  { id: "luxury", name: "Luxury", description: "Premium, high-end aesthetic", bgClass: "bg-gradient-to-br from-zinc-900 to-black text-white border-zinc-800" },
  { id: "ecommerce", name: "E-Commerce", description: "Marketplace-ready product images", bgClass: "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800" }
];

const LOADING_MESSAGES = [
  "Setting up scene...",
  "Placing product...",
  "Adjusting lighting...",
  "Rendering final shot..."
];

export default function CreatePhotoshootPage() {
  const [productImage, setProductImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [mode, setMode] = useState<"product" | "model">("product");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [shootType, setShootType] = useState<string>("studio");
  const [prompt, setPrompt] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<"generate" | "regenerate" | "angles" | "improve" | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [imagesUsed, setImagesUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10);

  useEffect(() => {
    setImagesUsed(DEFAULT_CREDITS.images_used);
    setMonthlyLimit(DEFAULT_CREDITS.monthly_limit);
  }, []);
  
  const [images, setImages] = useState<{url: string, angle: string}[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPollingRef = useRef(false);
  const recoveryAttemptsRef = useRef(0);

  const isPollingStale = () => {
    const raw = localStorage.getItem("polling_active");
    if (!raw) return true; // doesn't exist = stale / free
    try {
      const obj = JSON.parse(raw);
      if (!obj.active) return true;
      if (Date.now() - obj.timestamp > 90 * 1000) return true; // >90s is stale
      return false; // valid & active
    } catch {
      return true;
    }
  };

  const setPollingLock = (active: boolean) => {
    if (active) {
      localStorage.setItem("polling_active", JSON.stringify({ active: true, timestamp: Date.now() }));
    } else {
      localStorage.removeItem("polling_active");
    }
  };

  // Resume active_generation on page load
  useEffect(() => {
    // Safe cleanup on unload (Optional Safety Layer)
    const handleUnload = () => {
      if (isPollingRef.current) {
        setPollingLock(false);
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    const raw = localStorage.getItem("active_generation");
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        // Validate timestamp (not older than 10 min)
        if (Date.now() - stored.created_at < 10 * 60 * 1000) {
          if (!isPollingStale()) {
             toast.info("Your photoshoot is running in another tab");
             return;
          }
          
          isPollingRef.current = true;
          setPollingLock(true);
          setIsLoading(true);
          toast.info("Resuming your photoshoot...", { description: "Please hold while we poll the results." });
          processGenerationResults(stored.request_ids, stored.multi_angle, stored.final_prompt, stored.shoot_type);
        } else {
          // older than 10 minutes, timeout.
          localStorage.removeItem("active_generation");
          setPollingLock(false);
        }
      } catch (e) {
        localStorage.removeItem("active_generation");
        setPollingLock(false);
      }
    }
    
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const tryResumeGeneration = (isCrossTabRecovery = false) => {
    if (isPollingRef.current) return;
    
    // Failsafe: Prevent Infinite Loops
    if (recoveryAttemptsRef.current >= 3) {
      localStorage.removeItem("active_generation");
      localStorage.removeItem("polling_active");
      recoveryAttemptsRef.current = 0;
      toast.error("Something went wrong. Please retry");
      return;
    }

    // 1. DOUBLE-CHECK LOCK BEFORE CLAIM
    if (!isPollingStale()) {
      if (isCrossTabRecovery) toast.info("Another tab resumed your photoshoot");
      return;
    }

    const rawGen = localStorage.getItem("active_generation");
    if (!rawGen) return;

    try {
      const stored = JSON.parse(rawGen);
      
      // Failsafe: Validate parsed data
      if (!stored || !Array.isArray(stored.request_ids)) {
         throw new Error("Corrupted cache");
      }

      // Validate timestamp (not older than 10 min)
      if (Date.now() - stored.created_at < 10 * 60 * 1000) {
        
        recoveryAttemptsRef.current += 1;

        // 3. LOCK CLAIM SAFETY (Set instantly before async logic)
        isPollingRef.current = true;
        setPollingLock(true);
        setIsLoading(true);
        toast.success("Continuing photoshoot...", { description: "Resuming unfinished generation." });
        processGenerationResults(stored.request_ids, stored.multi_angle, stored.final_prompt, stored.shoot_type);
      } else {
        localStorage.removeItem("active_generation");
      }
    } catch {
      localStorage.removeItem("active_generation");
      recoveryAttemptsRef.current = 0;
    }
  };

  // Listen for Cross-Tab Lock Removals (Auto-resumes if blocking tab crashes/closes)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Trigger only when polling lock is completely freed
      if (e.key === "polling_active" && isPollingStale()) {
        tryResumeGeneration(true);
      }
    };
    
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Rotate loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 1500);
    } else {
      setLoadingMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
         setProductImage(reader.result as string);
         setImages([]);
         setSelectedImage(null);
         
         // Smart Prompt Auto-Fill
         const fname = file.name.toLowerCase();
         if (!prompt) {
           if (fname.includes("watch")) setPrompt("wearing luxury watch, close-up wrist shot");
           else if (fname.includes("sunglass")) setPrompt("wearing stylish sunglasses, studio lighting");
           else if (fname.includes("bag") || fname.includes("purse")) setPrompt("holding premium handbag, fashion pose");
           else if (fname.includes("shoe") || fname.includes("sneaker")) setPrompt("wearing stylish shoes, full body pose");
           else setPrompt("default product photoshoot, realistic lighting");
         }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (
    actionType: "generate" | "regenerate" | "angles" | "improve", 
    options: { multiAngle?: boolean; improveQuality?: boolean } = {}
  ) => {
    if (!productImage || !shootType) {
      alert("Complete setup first");
      return;
    }
    
    if (imagesUsed >= monthlyLimit) {
      alert("Limit reached");
      return;
    }

    if (isPollingRef.current) return;
    if (!isPollingStale()) {
      toast.info("Your photoshoot is running in another tab");
      return;
    }

    isPollingRef.current = true;
    setPollingLock(true);

    setIsLoading(true);
    setActiveAction(actionType);
    setIsSuccess(false);
    
    // Clear previous if not regenerating or adding more angles
    if (!options.multiAngle && !options.improveQuality) {
       setImages([]);
       setSelectedImage(null);
    }
    
    recoveryAttemptsRef.current = 0;

    try {
      let finalPrompt = prompt || `A beautiful product photo in ${SHOOT_STYLES.find(s => s.id === shootType)?.name || shootType} style`;
      if (options.improveQuality) {
        finalPrompt += ", masterpiece, 8k resolution, photorealistic, premium quality, ultra-detailed textures";
      }
      if (actionType === "regenerate") {
        finalPrompt += ", different angle, variation";
      }

      const generateResponse = await generateShoot({
        product_image: productImage || imageUrl,
        user_prompt: finalPrompt,
        shoot_type: shootType,
        gender: mode === "model" ? gender : "female", // Provide fallback gender
        multi_angle: options.multiAngle || false
      });

      const requestData = generateResponse;
      if (!requestData || requestData.length === 0) {
        throw new Error("No valid request IDs returned");
      }

      // 1. SAVE GENERATION: Map state resilience
      localStorage.setItem("active_generation", JSON.stringify({
        request_ids: requestData,
        multi_angle: options.multiAngle || false,
        final_prompt: finalPrompt,
        shoot_type: shootType,
        created_at: Date.now()
      }));

      await processGenerationResults(requestData, options.multiAngle || false, finalPrompt, shootType);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong generating the photoshoot");
      setIsLoading(false);
      setActiveAction(null);
      isPollingRef.current = false;
      setPollingLock(false);
      
      // Attempt recovery recursively if generation still suspended
      setTimeout(() => tryResumeGeneration(), 100);
    }
  };

  const processGenerationResults = async (requestData: any[], multiAngle: boolean, finalPrompt: string, shootType: string) => {
    try {

      const finalImages = await Promise.all(
        requestData.map(async (req) => {
          if (!req.request_id) return null;
          const url = await pollImage(req.request_id);
          return { url, angle: req.angle || "Standard View" };
        })
      );

      const validImages = finalImages.filter(Boolean) as {url: string, angle: string}[];
      
      if (validImages.length === 0) {
         toast.error("Generation failed. Please try again.");
         localStorage.removeItem("active_generation");
         return;
      }
      
      setImages(prev => multiAngle ? [...prev, ...validImages] : validImages);
      
      if (validImages.length > 0 && !multiAngle) {
         setSelectedImage(validImages[0].url);
      }

      setIsSuccess(true);
      toast.success(`Photoshoot ready!`);
      
      // Reset failsafe layer globally
      recoveryAttemptsRef.current = 0;
      
      // Refresh image usages natively
      setImagesUsed(DEFAULT_CREDITS.images_used);

      // Remove from storage after full completion
      localStorage.removeItem("active_generation");

      // Save History (Frontend State)
      const generationRecord = {
        id: "gen_" + Date.now(),
        image_urls: validImages.map(img => img.url),
        images: validImages.map(img => img.url),
        prompt: finalPrompt,
        model: shootType,
        created_at: new Date().toISOString(),
        status: "completed"
      };
      const existing = JSON.parse(localStorage.getItem("recent_generations") || "[]");
      localStorage.setItem("recent_generations", JSON.stringify([generationRecord, ...existing]));

      // Scroll to results smoothly
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Polling failed. Something went wrong resuming the photoshoot.");
      localStorage.removeItem("active_generation");
    } finally {
      isPollingRef.current = false;
      setPollingLock(false);
      setIsLoading(false);
      setActiveAction(null);
      setTimeout(() => setIsSuccess(false), 4000);

      // Attempt recovery on same tab if queued overlapping generations exist
      setTimeout(() => tryResumeGeneration(), 100);
    }
  };

  const downloadImage = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `generation-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Failed to download");
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    toast.success(`Downloading ${images.length} images...`);
    for (const img of images) {
      await downloadImage(img.url);
      // slight delay between downloads
      await new Promise(r => setTimeout(r, 300));
    }
  };

  const getAngleLabel = (rawAngle: string) => {
    const a = rawAngle.toLowerCase();
    if (a.includes("front")) return "Front View";
    if (a.includes("side")) return "Side View";
    if (a.includes("45")) return "45° Angle";
    if (a.includes("close")) return "Close-up";
    return rawAngle.charAt(0).toUpperCase() + rawAngle.slice(1);
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 md:p-10 pb-32 space-y-10">
        {/* --- SECTION 1: HERO CANVAS PREVIEW --- */}
        <section className="w-full flex justify-center pt-4">
          <div className={cn(
            "w-full rounded-2xl bg-white p-8 shadow-sm border border-border/50 relative overflow-hidden flex items-center justify-center group flex-col min-h-[300px]",
            SHOOT_STYLES.find(s => s.id === shootType)?.bgClass
          )}>
            {(productImage || imageUrl) ? (
              <motion.img 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                src={productImage} 
                alt="Product Preview" 
                className={cn(
                  "max-h-[85%] max-w-[85%] object-contain z-10 transition-transform duration-500",
                  shootType === "outdoor" ? "drop-shadow-[0_20px_35px_rgba(0,0,0,0.2)]" : "drop-shadow-2xl",
                  isLoading && "animate-pulse brightness-110"
                )} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground z-10 space-y-5">
                <div className="w-24 h-24 bg-background/40 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm border border-foreground/5">
                  <Camera className="w-10 h-10 text-foreground/70" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold tracking-tight text-foreground/90">Upload a product to start</p>
                  <p className="text-base text-foreground/60">Create stunning AI photos in seconds</p>
                </div>
              </div>
            )}

            {/* Model Silhouette Overlay */}
            <AnimatePresence>
              {mode === "model" && productImage && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
                >
                  <div className="absolute right-[15%] md:right-[25%] bottom-0 opacity-10">
                    <svg viewBox="0 0 100 200" className={cn(
                      "w-48 h-96 md:w-64 md:h-[500px]",
                      shootType === "luxury" ? "fill-white" : "fill-black dark:fill-white"
                    )}>
                      <path d="M50,10 C60,10 65,20 60,30 C58,35 48,35 45,30 C40,20 40,10 50,10 Z M25,60 C40,40 60,40 75,60 C80,80 85,120 70,120 C65,120 60,100 60,100 C60,150 70,200 65,200 L50,150 L35,200 C30,200 40,150 40,100 C40,100 35,120 30,120 C15,120 20,80 25,60 Z" />
                    </svg>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Canvas Badges */}
            <div className="absolute top-6 left-6 flex flex-wrap gap-2 z-20">
              <span className="backdrop-blur-xl bg-background/50 text-foreground text-xs px-4 py-2 rounded-full font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-foreground/5 transition-colors">
                Live Preview
              </span>
              {(productImage || imageUrl) && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="backdrop-blur-xl bg-primary/20 text-primary text-xs px-4 py-2 rounded-full font-semibold shadow-sm border border-primary/20 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" /> 
                  {mode === "model" ? (gender === "male" ? "Male Model" : "Female Model") : "Product"} • {SHOOT_STYLES.find(s => s.id === shootType)?.name}
                </motion.span>
              )}
            </div>

             {/* Change Product Button (Overlayed when hovered) */}
             {productImage && !isLoading && (
               <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-8 z-20">
                 <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="shadow-xl rounded-full px-6 backdrop-blur-md bg-white/90 text-black hover:bg-white border-0">
                    <RefreshCw className="w-4 h-4 mr-2" /> Change Product
                 </Button>
               </div>
             )}
          </div>
        </section>

        {/* --- FORM SECTIONS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Upload & Basics */}
          <div className="lg:col-span-5 space-y-10">
             <section className="space-y-5">
               <h2 className="text-xl font-medium text-gray-700">1. Product Setup</h2>
               
               <div className="mt-8 space-y-6">
                 <div 
                   onClick={() => !productImage && fileInputRef.current?.click()}
                   className={cn(
                     "border-2 border-dashed rounded-2xl p-12 text-center hover:border-black hover:bg-gray-50 transition cursor-pointer relative group overflow-hidden",
                     !productImage 
                      ? "border-border/60 text-muted-foreground" 
                      : "border-solid border-border bg-card"
                   )}
                 >
                   {productImage ? (
                     <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary flex-shrink-0 border">
                          <img src={productImage} alt="Setup Thumb" className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 text-left">
                          <p className="font-semibold">Product Uploaded</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Ready for photoshoot</p>
                       </div>
                       <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setProductImage(null); }} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="w-5 h-5" />
                       </Button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center text-center">
                       <div className="w-14 h-14 bg-background rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-6 h-6 text-primary" />
                       </div>
                       <p className="font-semibold text-foreground">Drop product image here</p>
                       <p className="text-sm text-muted-foreground mt-1">High quality PNG or JPG recommended</p>
                     </div>
                   )}
                   <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileUpload} />
                 </div>
                 
                 <input
                   type="text"
                   placeholder="Paste product image URL"
                   value={imageUrl}
                   onChange={(e) => setImageUrl(e.target.value)}
                   className="w-full max-w-xl border rounded-lg px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                 />
               </div>
             </section>

             {(productImage || imageUrl) && (
               <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                 <h2 className="text-xl font-medium text-gray-700">2. Subject Mode</h2>
                 <div className="flex gap-3 bg-secondary/30 p-1.5 rounded-2xl border border-border/50">
                    {(["product", "model"] as const).map(m => (
                       <button
                         key={m}
                         onClick={() => setMode(m)}
                         className={cn(
                           "flex-1 py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 text-sm",
                           mode === m 
                             ? "bg-background text-foreground shadow-sm scale-[1.02]" 
                             : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                         )}
                       >
                         {m === "model" ? "With AI Model" : "Product Focused"}
                       </button>
                    ))}
                 </div>
                 
                 <AnimatePresence>
                   {mode === "model" && (
                     <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2">
                       <div className="flex gap-3">
                         {(["female", "male"] as const).map(g => (
                           <button
                             key={g}
                             onClick={() => setGender(g)}
                             className={cn(
                               "flex-1 py-3 px-4 rounded-xl border-2 font-semibold transition-all duration-300 capitalize text-sm",
                               gender === g 
                                 ? "border-primary bg-primary/5 text-primary" 
                                 : "border-border/50 bg-card hover:border-primary/30 text-muted-foreground"
                             )}
                           >
                             {g} Model
                           </button>
                         ))}
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
               </motion.section>
             )}
          </div>

          {/* Right Column: Style & Generate */}
          {(productImage || imageUrl) && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 space-y-10">
                <section className="space-y-5">
                   <h2 className="text-xl font-medium text-gray-700">3. Choose Environment</h2>
                   <div className="grid grid-cols-2 gap-4">
                     {SHOOT_STYLES.map(style => (
                       <button
                         key={style.id}
                         onClick={() => setShootType(style.id)}
                         className={cn(
                           "p-6 rounded-2xl bg-white text-left transition transform duration-300 group relative overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02]",
                           shootType === style.id 
                             ? "border-2 border-primary ring-4 ring-primary/10 scale-[1.02]" 
                             : "border border-border/50 hover:border-black"
                         )}
                       >
                         {shootType === style.id && (
                            <motion.div layoutId="styleIndicator" className="absolute top-4 right-4 w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                         )}
                         <div className="mt-8 space-y-1 relative z-10">
                            <h3 className={cn("font-bold text-lg", shootType === style.id ? "text-primary" : "text-foreground")}>{style.name}</h3>
                            <p className="text-sm text-muted-foreground leading-snug">{style.description}</p>
                         </div>
                       </button>
                     ))}
                   </div>
                   {!shootType && <p className="text-sm text-amber-500 font-medium">✨ Choose a style to control lighting & background</p>}
                </section>

                <section className="space-y-4">
                   <h2 className="text-xl font-medium text-gray-700 flex items-center gap-2">
                     4. Custom Direction <span className="text-muted-foreground font-medium text-sm">(Optional)</span>
                   </h2>
                   <Textarea 
                     value={prompt}
                     onChange={(e) => setPrompt(e.target.value)}
                     placeholder="e.g., 'Soft morning sunlight, placed on a marble pedestal, bokeh effect'"
                     className="w-full min-h-[100px] rounded-2xl bg-card border-border/60 focus:border-primary resize-none text-base p-4"
                   />
                </section>

                <div className="pt-6 border-t border-border/50">
                  <div className="space-y-4">
                    {(productImage || imageUrl) && shootType && !isLoading && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm font-medium text-muted-foreground italic flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" /> Preview: {SHOOT_STYLES.find(s=>s.id === shootType)?.name} lighting with clean background and product focus
                      </motion.p>
                    )}
                    <div className="flex flex-col md:flex-row gap-4">
                      <Button 
                        size="lg" 
                        onClick={() => handleGenerate("generate", { multiAngle: false })} 
                        disabled={isLoading || !(productImage || imageUrl) || !shootType || (imagesUsed >= monthlyLimit)}
                        className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 active:scale-95 transition transform hover:scale-[1.02] h-16 w-full md:w-auto text-xl font-bold disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isLoading && activeAction === "generate" ? (
                          <span className="flex items-center gap-3">
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             {LOADING_MESSAGES[loadingMsgIdx]}
                          </span>
                        ) : (imagesUsed >= monthlyLimit) ? (
                          <span className="flex items-center gap-3 opacity-90 text-red-300">
                             Image Limit Reached
                          </span>
                        ) : !(productImage || imageUrl) || !shootType ? (
                          <span className="flex items-center gap-3 opacity-90">
                             Complete setup to generate
                          </span>
                        ) : (
                          <span className="flex items-center gap-3">
                             <Sparkles className="w-6 h-6"/> Generate Images
                          </span>
                        )}
                      </Button>
                      
                      {imagesUsed >= monthlyLimit && (
                        <Button 
                          size="lg" 
                          onClick={() => window.location.href = "/dashboard/billing"} 
                          className="bg-primary text-white border-none shadow-md px-6 py-3 rounded-xl hover:bg-primary/90 active:scale-95 transition transform hover:scale-[1.02] h-16 w-full md:w-auto text-xl font-bold"
                        >
                          <span className="flex items-center gap-2">Upgrade Plan</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
             </motion.div>
          )}
        </div>

        {/* --- SECTION 4: RESULTS REVEAL --- */}
        <AnimatePresence>
          {(isLoading || images.length > 0) && (
            <motion.div 
              id="results"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
              className="w-full pt-16 border-t border-border/50 space-y-8"
            >
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="flex items-start gap-6">
                  {/* ORIGINAL PREVIEW */}
                  {productImage && (
                    <div className="flex items-center gap-4 bg-secondary/40 p-2 pr-6 rounded-full border border-border/50 max-w-fit shadow-sm">
                      <img src={productImage} alt="Original" className="w-12 h-12 rounded-full object-cover border-2 border-background" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Original</span>
                        <span className="text-sm font-semibold text-foreground/90 leading-tight">Input Reference</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-1 hidden md:block">
                    <h1 className="text-3xl font-semibold">Your Photoshoot</h1>
                    <AnimatePresence>
                      {isSuccess && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-500 font-medium">
                          <CheckCircle2 className="w-5 h-5 fill-green-100" /> Your photoshoot is ready
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* Removed Action Controls top block */}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {/* RESULTS */}
                <AnimatePresence mode="popLayout">
                  {images.map((img, i) => (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ duration: 0.5, delay: i * 0.15 }}
                       key={`img-${img.url}-${i}`}
                       onClick={() => setSelectedImage(img.url)}
                       className={cn(
                         "group relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-secondary shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 cursor-pointer",
                         selectedImage === img.url ? "ring-4 ring-primary ring-offset-2 border-transparent" : "border border-border/50"
                       )}
                     >
                       {/* ANGLE INTELLIGENCE BADGE */}
                       <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
                         <div className="flex gap-2">
                           <span className="backdrop-blur-md bg-black/40 text-white text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold shadow-sm border border-white/10">
                             {getAngleLabel(img.angle)}
                           </span>
                           <span className="backdrop-blur-md bg-black/40 text-amber-300 text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold shadow-sm border border-white/10">
                             {i === 0 ? "HD" : i === 1 ? "Best Angle" : "Close-up"}
                           </span>
                         </div>
                         {selectedImage === img.url && (
                           <motion.span 
                             initial={{ scale: 0 }} animate={{ scale: 1 }} 
                             className="bg-primary text-primary-foreground text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1"
                           >
                              <CheckCircle2 className="w-3 h-3" /> Selected
                           </motion.span>
                         )}
                       </div>

                       <img 
                         src={img.url} 
                         alt={`Generated result ${i}`} 
                         className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                       />
                       
                       <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
                          <Button 
                            variant="secondary" 
                            className="w-full shadow-xl rounded-full bg-white text-black hover:bg-neutral-200 font-bold"
                            onClick={(e) => { e.stopPropagation(); downloadImage(img.url); }}
                          >
                            <Download className="w-4 h-4 mr-2" /> Download Image
                          </Button>
                       </div>
                     </motion.div>
                  ))}

                  {/* SKELETON LOADERS - MAGICAL CONCEPT */}
                  {isLoading && Array.from({ length: images.length > 0 ? 2 : 4 }).map((_, i) => (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.9 }}
                       key={`skel-${i}`} 
                       className="relative aspect-[4/5] rounded-[2rem] border-2 border-primary/20 bg-card overflow-hidden"
                     >
                       <div className="absolute inset-0 bg-gradient-to-tr from-secondary via-primary/5 to-secondary animate-pulse opacity-50" />
                       <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent h-1/2 w-full animate-[scan_2s_ease-in-out_infinite]" />

                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          >
                             <Sparkles className="w-8 h-8 text-primary opacity-80" />
                          </motion.div>
                       </div>
                     </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {/* ACTION CONTROLS (MOVED TO BOTTOM) */}
              {images.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => handleGenerate("regenerate", { multiAngle: false })} 
                      disabled={isLoading}
                      className="rounded-xl shadow-sm hover:shadow-md transition transform hover:scale-[1.02] h-12 px-6"
                    >
                      {isLoading && activeAction === "regenerate" ? (
                         <div className="w-4 h-4 mr-2 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                      ) : (
                         <RefreshCw className="w-4 h-4 mr-2 text-muted-foreground" />
                      )}
                      Regenerate
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleGenerate("improve", { improveQuality: true })} 
                      disabled={isLoading}
                      className="rounded-xl shadow-sm hover:shadow-md transition transform hover:scale-[1.02] h-12 px-6 text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      {isLoading && activeAction === "improve" ? (
                         <div className="w-4 h-4 mr-2 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                      ) : (
                         <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Improve Quality
                    </Button>
                    <Button 
                      onClick={() => handleGenerate("angles", { multiAngle: true })} 
                      disabled={isLoading}
                      className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 active:scale-95 transition transform hover:scale-[1.02] shadow-sm h-12"
                    >
                      {isLoading && activeAction === "angles" ? (
                         <div className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                         <Focus className="w-4 h-4 mr-2" />
                      )}
                      More Angles
                    </Button>
                  </div>
              )}
              
              {/* Generation Progress Bar */}
              <AnimatePresence mode="wait">
                {isLoading && (
                   <motion.div 
                     key={loadingMsgIdx}
                     initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                     className="w-full max-w-md mx-auto space-y-3 pt-4"
                   >
                     <div className="flex justify-between items-center text-sm font-bold text-primary">
                       <span>{LOADING_MESSAGES[loadingMsgIdx]}</span>
                       <span>{Math.min(((loadingMsgIdx + 1) / LOADING_MESSAGES.length) * 100, 100)}%</span>
                     </div>
                     <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden shadow-inner">
                       <motion.div 
                         className="h-full bg-primary"
                         initial={{ width: "0%" }}
                         animate={{ width: `${Math.min(((loadingMsgIdx + 1) / LOADING_MESSAGES.length) * 100, 100)}%` }}
                         transition={{ duration: 0.5, ease: "easeInOut" }}
                       />
                     </div>
                   </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
