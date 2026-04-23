import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Sparkles,
  Download,
  Image as ImageIcon,
  UserCircle2,
  Box,
  Crown,
  Settings,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// --- TEMPLATES DATA ---
const TEMPLATES = [
  {
    id: "fashion_editorial",
    category: "Fashion",
    label: "Editorial Shoot",
    description: "High-end magazine style, dramatic lighting",
    requiresModel: true,
    premium: true,
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "fashion_streetwear",
    category: "Fashion",
    label: "Streetwear",
    description: "Urban environment, edgy style",
    requiresModel: true,
    premium: false,
    image: "https://images.unsplash.com/photo-1550614000-4b95d4662d5f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cosmetics_luxury_skincare",
    category: "Cosmetics",
    label: "Luxury Skincare",
    description: "Soft lighting, premium aesthetic",
    requiresModel: false,
    premium: true,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cosmetics_white_studio",
    category: "Cosmetics",
    label: "Clean White Studio",
    description: "Minimal shadows, ecommerce style",
    requiresModel: false,
    premium: false,
    image: "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "jewelry_dark_luxury",
    category: "Jewelry",
    label: "Dark Luxury",
    description: "Dark background, gold reflections",
    requiresModel: false,
    premium: true,
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "jewelry_marble",
    category: "Jewelry",
    label: "Marble Surface",
    description: "Elegant marble, natural light",
    requiresModel: false,
    premium: false,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "campaign_cosmetics_model",
    category: "Model Campaigns",
    label: "Cosmetics Model Shoot",
    description: "Model interacting with skincare product",
    requiresModel: true,
    premium: true,
    image: "https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "campaign_premium_ad",
    category: "Model Campaigns",
    label: "Premium Campaign Ad",
    description: "High budget commercial look",
    requiresModel: true,
    premium: true,
    image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80"
  }
];

const CATEGORIES = ["Fashion", "Cosmetics", "Jewelry", "Model Campaigns"];

const SIZES = [
  { label: "1:1", name: "Square" },
  { label: "16:9", name: "Widescreen" },
  { label: "9:16", name: "Social story" },
  { label: "2:3", name: "Portrait" },
  { label: "3:4", name: "Traditional" },
  { label: "1:2", name: "Vertical" },
  { label: "2:1", name: "Horizontal" },
  { label: "4:5", name: "Social post" },
  { label: "3:2", name: "Standard" },
  { label: "4:3", name: "Classic" },
];

const IMAGE_LIMIT = 30;

export default function CreatePhotoshootPage() {
  // Filters
  const [activeCategory, setActiveCategory] = useState<string>("Cosmetics");
  
  // Selections
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);
  
  // Images
  const [productImage, setProductImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Control Panel State
  const [modelType, setModelType] = useState("auto");
  const [useModel, setUseModel] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [imageCount, setImageCount] = useState(2);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Status & Limits
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Generating images...");
  const [error, setError] = useState<string>("");
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<string[]>([]);
  const [imagesUsed, setImagesUsed] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Auth & Usage Fetch
  useEffect(() => {
    const fetchAuthAndUsage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        const { data } = await supabase.from('users_usage').select('images_used').eq('user_id', session.user.id).single();
        if (data) setImagesUsed(data.images_used);
      }
    };
    fetchAuthAndUsage();
  }, []);

  // Safety & Recovery Refs
  const lastRequestRef = useRef<any>(null);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // 1. Local Storage Safe Load
  useEffect(() => {
    const saved = localStorage.getItem("photoshoot_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.template && TEMPLATES.some(t => t.id === parsed.template)) {
          setSelectedTemplateId(parsed.template);
        }
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.modelType) setModelType(parsed.modelType);
      } catch (e) {}
    }
  }, []);

  // 2. Local Storage Safe Save
  useEffect(() => {
    localStorage.setItem("photoshoot_settings", JSON.stringify({
      template: selectedTemplateId,
      aspectRatio,
      modelType
    }));
  }, [selectedTemplateId, aspectRatio, modelType]);

  // Auto Default Logic
  useEffect(() => {
    if (activeCategory === "Fashion") {
      setAspectRatio("4:5");
      setUseModel(true);
    } else if (activeCategory === "Cosmetics") {
      setAspectRatio("1:1");
      setUseModel(false);
    } else if (activeCategory === "Jewelry") {
      setAspectRatio("1:1");
      setUseModel(false);
    } else if (activeCategory === "Model Campaigns") {
      setAspectRatio("4:5");
      setUseModel(true);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (selectedTemplate) {
      if (selectedTemplate.requiresModel) {
        setUseModel(true);
      }
    }
  }, [selectedTemplate]);

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory);

  const isGenerateReady = () => {
    if (!selectedTemplate) return false;
    if (!productImage) return false;
    if (useModel && !faceImage) return false;
    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'face' | 'bg') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be under 10MB");
        return;
      }
      try {
        setUploadingState(prev => ({ ...prev, [type]: true }));
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `generated/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("generated-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("generated-images")
          .getPublicUrl(filePath);

        if (type === 'product') setProductImage(data.publicUrl);
        if (type === 'face') setFaceImage(data.publicUrl);
        if (type === 'bg') setBackgroundImage(data.publicUrl);
        
        toast.success(`${type} image uploaded successfully`);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error("Failed to upload image.");
      } finally {
        setUploadingState(prev => ({ ...prev, [type]: false }));
      }
    }
  };

  const executeGeneration = async (useLastRequest: boolean = false) => {
    let payload;

    if (useLastRequest && lastRequestRef.current) {
      payload = lastRequestRef.current;
    } else {
      if (!isGenerateReady()) return;
      
      if (!currentUser) {
        setError("You must be logged in to generate images.");
        toast.error("Please log in first");
        return;
      }
      
      payload = {
        template: selectedTemplateId,
        productImage,
        faceImage: useModel ? faceImage : null,
        backgroundImage,
        aspectRatio,
        imageCount,
        customPrompt,
        modelType,
        userId: currentUser.id
      };
      // 3. Save Payload Guarantee for Regenerate
      lastRequestRef.current = payload;
    }

    // Check Limits First (Frontend Double Check)
    if (imagesUsed + payload.imageCount > IMAGE_LIMIT) {
      setError(`You have reached your monthly image limit of ${IMAGE_LIMIT}.`);
      toast.error("Monthly image limit reached");
      return;
    }
    
    try {
      setIsGenerating(true);
      setLoadingMessage("Generating images...");
      setError("");
      setResults([]);
      
      // Mobile UX Fix: Close drawer immediately
      if (isMobilePanelOpen) setIsMobilePanelOpen(false);

      // 4. Soft Messaging via Timers
      const coldStartTimer = setTimeout(() => {
        setLoadingMessage("Waking up server, please wait...");
      }, 5000);
      
      const slowTimer = setTimeout(() => {
        setLoadingMessage("This is taking longer than usual...");
      }, 20000);

      const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://product-photoshoot-ai.onrender.com";
      const exactFetchUrl = `${API_BASE}/api/generate`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

      const res = await fetch(exactFetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearTimeout(coldStartTimer);
      clearTimeout(slowTimer);

      if (res.status === 403) {
        throw new Error("Monthly image limit reached");
      }
      if (!res.ok) throw new Error(`API failure: ${res.status}`);

      const data = await res.json();
      if (!data || !data.success || !data.images || data.images.length === 0) {
        throw new Error("Empty response or generation failed");
      }

      setResults(data.images);
      
      // 5. Safe Usage Increment
      setImagesUsed(prev => prev + payload.imageCount);
      toast.success("Images generated successfully!");
      
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

    } catch (err: any) {
      console.error("🔥 ERROR:", err);
      let errorMsg = "Generation failed, try again";
      if (err.name === 'AbortError') errorMsg = "Generation timed out. Please try again.";
      if (err.message) errorMsg = err.message;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
      setLoadingMessage("Generating images...");
    }
  };

  // Compact Upload UI Component
  const CompactUploadBox = ({ label, image, onClear, onUpload, uploading, icon: Icon, required }: any) => (
    <div className="w-full">
      {image ? (
        <div className="w-full h-[60px] bg-white/5 border border-white/10 rounded-xl flex items-center p-2 relative overflow-hidden group">
          <img src={image} className="w-11 h-11 rounded-lg object-cover mr-3 bg-black" />
          <div className="flex-1 overflow-hidden pr-2">
            <span className="text-sm font-medium text-white truncate block">{label}</span>
            <span className="text-[11px] text-green-400 font-medium">Uploaded successfully</span>
          </div>
          <button onClick={onClear} className="p-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg backdrop-blur-sm mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button 
          onClick={onUpload}
          disabled={uploading}
          className="w-full h-12 bg-white/5 border border-white/10 border-dashed rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-colors hover:border-white/30 text-gray-400 hover:text-white group disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label} {required && <span className="text-red-400 ml-0.5">*</span>}</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans flex flex-col relative">
      {/* Header */}
      <header className="h-16 border-b bg-white flex items-center px-6 lg:px-10 shrink-0 sticky top-0 z-30">
        <h1 className="font-bold text-xl tracking-tight">Create Photoshoot</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT SIDEBAR: Category Navigation */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r bg-white p-4 lg:p-6 shrink-0 lg:h-[calc(100vh-4rem)] lg:sticky top-16 overflow-y-auto custom-scrollbar">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 hidden lg:block">Categories</h2>
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedTemplateId(""); setError(""); }}
                className={cn(
                  "px-4 py-2.5 lg:py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap flex items-center justify-between shrink-0",
                  activeCategory === cat 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {cat}
                {cat === "Model Campaigns" && <Sparkles className={cn("w-4 h-4 ml-2", activeCategory === cat ? "text-yellow-400" : "text-amber-500")} />}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT: Template Grid */}
        <main className="flex-1 p-4 lg:p-10 overflow-y-auto lg:h-[calc(100vh-4rem)] custom-scrollbar bg-gray-50/50 pb-32 lg:pb-10 relative">
          <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8">
            <div>
              <h2 className="text-2xl font-bold">{activeCategory} Templates</h2>
              <p className={cn("mt-1 text-sm font-medium", selectedTemplate ? "text-blue-600" : "text-gray-500")}>
                {selectedTemplate ? `Selected: ${selectedTemplate.label}` : "Select a style for your product photoshoot"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => { setSelectedTemplateId(template.id); setError(""); }}
                  className={cn(
                    "group relative bg-white rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:shadow-xl",
                    selectedTemplateId === template.id 
                      ? "border-black shadow-lg ring-4 ring-black/5 scale-[1.02]" 
                      : "border-transparent shadow-sm hover:border-gray-200"
                  )}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden relative bg-gray-100">
                    <img src={template.image} alt={template.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {template.premium && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-yellow-400 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex items-center gap-1 uppercase tracking-wider">
                        <Crown className="w-3 h-3" /> Pro
                      </div>
                    )}
                    {selectedTemplateId === template.id && (
                       <div className="absolute inset-0 bg-black/10 border-4 border-black rounded-xl transition-all" />
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{template.label}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 6. ERROR UX IMPROVEMENT */}
            {error && (
              <div className="bg-red-50 border border-red-200 px-4 py-4 rounded-xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 text-red-600">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-medium text-sm">{error}</p>
                </div>
                {lastRequestRef.current && (
                   <Button onClick={() => executeGeneration(true)} variant="outline" size="sm" className="bg-white border-red-200 text-red-600 hover:bg-red-50 font-bold">
                     <RefreshCw className="w-3 h-3 mr-2" /> Retry
                   </Button>
                )}
              </div>
            )}

            {/* EMPTY STATE */}
            {!isGenerating && results.length === 0 && !error && (
               <div className="pt-16 pb-12 flex flex-col items-center justify-center text-center opacity-60">
                 <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
                 <h3 className="text-gray-500 font-medium">No images yet — generate your first photoshoot</h3>
               </div>
            )}

            {/* Results Section */}
            <AnimatePresence>
              {(isGenerating || results.length > 0) && (
                <motion.div 
                  id="results"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
                  className="pt-10 lg:pt-12 border-t border-gray-200 mt-10 pb-10"
                >
                  <h3 className="text-2xl font-bold mb-6">Generated Results</h3>
                  
                  {isGenerating && (
                    <div className="py-24 flex flex-col items-center justify-center space-y-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                      <p className="text-gray-500 animate-pulse font-medium text-lg">{loadingMessage}</p>
                    </div>
                  )}

                  {!isGenerating && results.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                      {results.map((img, i) => (
                        <div key={i} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100 aspect-square sm:aspect-auto">
                          <img src={img} alt="Generated result" className="w-full h-full sm:h-auto object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-3 p-4">
                            {/* 7. Download Reliability (Direct Anchor tags inside buttons for clean styling) */}
                            <a href={img} download={`photo-${selectedTemplateId || 'generation'}.png`} target="_blank" rel="noreferrer" className="w-48">
                              <Button className="bg-white text-black hover:bg-gray-100 rounded-full font-bold w-full shadow-lg">
                                <Download className="w-4 h-4 mr-2" /> Download
                              </Button>
                            </a>
                            <Button onClick={() => executeGeneration(true)} className="bg-blue-600 text-white hover:bg-blue-500 rounded-full font-bold w-48 shadow-lg">
                              <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* MOBILE OVERLAY */}
        <div 
          className={cn("fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity backdrop-blur-sm", isMobilePanelOpen ? "opacity-100" : "opacity-0 pointer-events-none")} 
          onClick={() => setIsMobilePanelOpen(false)} 
        />

        {/* MOBILE FLOATING BUTTON */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <Button onClick={() => setIsMobilePanelOpen(true)} className="rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.3)] px-6 py-6 bg-black text-white hover:bg-gray-800 text-base font-bold whitespace-nowrap">
             <Settings className="w-5 h-5 mr-2" /> Configure
          </Button>
        </div>

        {/* RIGHT PANEL: Compact Control System */}
        <aside className={cn(
          "fixed lg:sticky top-0 right-0 h-full lg:h-[calc(100vh-4rem)] z-50 lg:z-20 w-[85vw] sm:w-[360px] lg:w-[340px] xl:w-[360px] bg-[#0A0A0A] text-gray-200 flex flex-col shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.15)] border-l border-white/5 transition-transform duration-300",
          isMobilePanelOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-white/10 bg-[#050505]">
            <span className="font-bold text-white flex items-center gap-2"><Settings className="w-4 h-4" /> Configuration</span>
            <button onClick={() => setIsMobilePanelOpen(false)} className="p-1 rounded-md hover:bg-white/10 transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-7 relative pb-10">
            
            {/* OVERLAY for disabled state */}
            {!selectedTemplate && (
              <div className="absolute inset-0 bg-[#0A0A0A]/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-white font-medium mb-1">Select a Template</h3>
                <p className="text-sm text-gray-400">Choose a style from the gallery to begin configuring your photoshoot.</p>
              </div>
            )}

            {/* MODEL SELECTOR */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Model</label>
              <div className="relative">
                <select 
                  value={modelType} 
                  onChange={(e) => setModelType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl text-sm px-4 py-2.5 text-white focus:outline-none focus:border-white/30 appearance-none transition-colors cursor-pointer"
                >
                  <option value="auto" className="bg-[#0A0A0A] text-white">Auto (Default)</option>
                  <option value="flux" className="bg-[#0A0A0A] text-white">Flux (Product-focused)</option>
                  <option value="seedream" className="bg-[#0A0A0A] text-white">Seedream (Model-focused)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            {/* REFERENCES SECTION */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">References</label>
              
              <div className="space-y-2.5">
                {/* Product Image Box */}
                <CompactUploadBox 
                  label="Upload Product" 
                  image={productImage} 
                  required
                  icon={Box}
                  onUpload={() => productInputRef.current?.click()} 
                  onClear={() => setProductImage(null)}
                  uploading={uploadingState.product}
                />
                <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                
                {/* Model Face Toggle + Box */}
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2 text-gray-300">
                      <UserCircle2 className="w-4 h-4 text-gray-400" /> Add Model Face
                    </span>
                    <button 
                      onClick={() => setUseModel(!useModel)}
                      className={cn("w-10 h-5 rounded-full relative transition-colors border border-white/10", useModel ? "bg-blue-600 border-blue-500" : "bg-white/10")}
                    >
                      <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[2px] transition-transform shadow-sm", useModel ? "translate-x-5" : "translate-x-[2px]")} />
                    </button>
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {useModel && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <CompactUploadBox 
                          label="Upload Face" 
                          image={faceImage} 
                          required={selectedTemplate?.requiresModel}
                          icon={UserCircle2}
                          onUpload={() => faceInputRef.current?.click()} 
                          onClear={() => setFaceImage(null)}
                          uploading={uploadingState.face}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'face')} />

                {/* Background Box */}
                <CompactUploadBox 
                  label="Upload Background" 
                  image={backgroundImage} 
                  icon={ImageIcon}
                  onUpload={() => bgInputRef.current?.click()} 
                  onClear={() => setBackgroundImage(null)}
                  uploading={uploadingState.bg}
                />
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')} />
              </div>
            </div>

            {/* PROMPT INPUT */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prompt (Optional)</label>
              <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Customize your scene..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl text-sm px-4 py-3 text-white focus:outline-none focus:border-white/30 resize-none placeholder:text-gray-500 transition-colors"
              />
            </div>

            {/* SETTINGS SECTION */}
            <div className="space-y-4 pt-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Settings</label>
              
              <div className="bg-white/5 border border-white/5 rounded-xl p-1">
                {/* Image Size */}
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-gray-300 pl-1">Aspect Ratio</span>
                  <div className="relative w-40">
                    <select 
                      value={aspectRatio} 
                      onChange={(e) => setAspectRatio(e.target.value)}
                      className="w-full bg-[#111111] border border-white/10 rounded-lg text-sm px-3 py-1.5 text-white focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
                    >
                      {SIZES.map(s => (
                        <option key={s.label} value={s.label} className="bg-[#0A0A0A]">{s.label} — {s.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/5 mx-2" />

                {/* Image Count */}
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-gray-300 pl-1">Image Count</span>
                  <div className="flex items-center bg-[#111111] border border-white/10 rounded-lg overflow-hidden h-8 w-40">
                    <button onClick={() => setImageCount(Math.max(1, imageCount - 1))} className="flex-1 hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex items-center justify-center">-</button>
                    <span className="w-10 text-sm font-medium text-center border-x border-white/10 text-white flex items-center justify-center h-full">{imageCount}</span>
                    <button onClick={() => setImageCount(Math.max(1, Math.min(4, imageCount + 1)))} className="flex-1 hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* LIMIT UI & GENERATE BUTTON (Sticky Bottom) */}
          <div className="p-5 border-t border-white/10 bg-[#050505] shrink-0 mt-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-gray-400">Monthly Usage</span>
                <span className={imagesUsed >= IMAGE_LIMIT ? "text-red-400 font-bold" : "text-gray-300"}>
                  {imagesUsed} / {IMAGE_LIMIT} images
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", imagesUsed >= IMAGE_LIMIT ? "bg-red-500" : "bg-blue-500")} 
                    style={{ width: `${Math.min(100, (imagesUsed/IMAGE_LIMIT)*100)}%` }} 
                  />
              </div>
            </div>
            
            <Button 
              onClick={() => executeGeneration()}
              disabled={isGenerating || !isGenerateReady()}
              className="w-full h-12 text-sm tracking-wide font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
              style={{
                background: isGenerateReady() && !isGenerating ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#1F2937',
                color: isGenerateReady() && !isGenerating ? 'white' : '#9CA3AF'
              }}
            >
              {isGenerating ? (
                 <span className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                   Generating...
                 </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Generate Photoshoot
                </span>
              )}
            </Button>
            {!isGenerateReady() && selectedTemplate && (
              <p className="text-center text-[11px] text-red-400 mt-3 font-medium">
                 Upload all required references to begin
              </p>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
