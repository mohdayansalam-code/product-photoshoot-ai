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
import { DEFAULT_CREDITS } from "@/lib/api";
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

  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [credits, setCredits] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const pollJob = async (id: string) => {
    let attempts = 0;

    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://product-photoshoot-ai.onrender.com";
        const res = await fetch(`${API_BASE}/api/status/${id}`);
        
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("JSON parse error during polling", jsonErr);
          continue;
        }

        if (!data) {
          console.error("Empty response during polling");
          continue;
        }

        console.log("📡 POLL DATA:", data);

        if (data.status === "completed" && data.images?.length) {
          console.log("✅ JOB DONE:", data);
          setGeneratedImages(data.images);
          setLoading(false);

          toast.success("Photoshoot ready!");
          setTimeout(() => {
            document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 300);
          return; // stop polling
        }

        if (data.status === "failed") {
          throw new Error("Generation failed on backend");
        }
      } catch (err) {
        console.error("🔥 ERROR in polling:", err);
      }
    }

    setLoading(false);
    toast.error("Timeout. Try again.");
  };

  const handleGenerate = async () => {
    console.log("🔥 BUTTON CLICKED");
    if (!productImage) {
      alert("Upload image first");
      return;
    }
    
    if (credits <= 0) {
      toast.error("No credits remaining!");
      return;
    }
    
    if (loading) return;
    
    try {
      setLoading(true);
      setGeneratedImages([]);

      // Decrease frontend mockup credits
      setCredits(prev => prev - 1);

      const finalPrompt = prompt || `${shootType} product photoshoot, perfect lighting, professional style, high quality, ecommerce, ultra realistic`;

      // Remove localhost completely, fallback strictly to exact production URL
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://product-photoshoot-ai.onrender.com";
      const exactFetchUrl = `${API_BASE}/api/generate`;

      console.log("API BASE:", API_BASE);
      console.log("FULL URL:", exactFetchUrl);
      
      const res = await fetch(exactFetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          image: productImage || imageUrl,
          num_images: 4
        })
      });

      console.log("🔥 RESPONSE STATUS:", res.status, res.statusText);
      
      if (!res.ok) {
         throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      console.log("API RESPONSE:", data);

      // ❌ STRICT VALIDATION
      if (!data || !data.job_id) {
        console.error("❌ INVALID RESPONSE:", data);
        throw new Error("No valid response from API");
      }

      // ✅ START FLOW
      setJobId(data.job_id);
      pollJob(data.job_id);

    } catch (err: any) {
      console.error("🔥 ERROR:", err);
      toast.error(`Generation failed: ${err.message || "Unknown network error"}`);
      setLoading(false);
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
    if (generatedImages.length === 0) return;
    toast.success(`Downloading ${generatedImages.length} images...`);
    for (const img of generatedImages) {
      await downloadImage(img);
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
                  loading && "animate-pulse brightness-110"
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
             {productImage && !loading && (
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
                    <div className="flex flex-col md:flex-row gap-4">
                      <Button 
                        size="lg" 
                        onClick={handleGenerate} 
                        disabled={loading || !productImage || !shootType}
                        className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-900 active:scale-95 transition transform hover:scale-[1.02] h-16 w-full md:w-auto text-xl font-bold disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating...</span>
                          </>
                        ) : "Generate Images"}
                      </Button>
                    </div>
                  </div>
                </div>
             </motion.div>
          )}
        </div>

        {/* --- SECTION 4: RESULTS REVEAL --- */}
        <AnimatePresence>
          {(loading || generatedImages.length > 0 || jobId) && (
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
                  </div>
                </div>
              </div>
              
              <div>
                {loading && (
                   <p className="text-muted-foreground animate-pulse text-lg py-4">
                     Generating photoshoot... This takes about 10-20 seconds.
                   </p>
                )}

                {!loading && generatedImages.length === 0 && (
                   <p className="text-muted-foreground text-lg py-4">
                     No results yet.
                   </p>
                )}

                {generatedImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {generatedImages?.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Generated result"
                        style={{ width: "100%", borderRadius: "12px" }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {generatedImages.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleDownloadAll} 
                      className="rounded-xl shadow-sm hover:shadow-md transition h-12 px-6"
                    >
                      Download All
                    </Button>
                  </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
