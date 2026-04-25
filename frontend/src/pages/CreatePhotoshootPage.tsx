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
    name: "Editorial Shoot",
    description: "High-end magazine style, dramatic lighting",
    requiresModel: true,
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "fashion_streetwear",
    category: "Fashion",
    name: "Streetwear",
    description: "Urban environment, edgy style",
    requiresModel: true,
    image: "https://images.unsplash.com/photo-1550614000-4b95d4662d5f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cosmetics_luxury_skincare",
    category: "Cosmetics",
    name: "Luxury Skincare",
    description: "Soft lighting, premium aesthetic",
    requiresModel: false,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "cosmetics_white_studio",
    category: "Cosmetics",
    name: "Clean White Studio",
    description: "Minimal shadows, ecommerce style",
    requiresModel: false,
    image: "https://images.unsplash.com/photo-1598452963314-b09f397a5c48?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "jewelry_dark_luxury",
    category: "Jewelry",
    name: "Dark Luxury",
    description: "Dark background, gold reflections",
    requiresModel: false,
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "jewelry_marble",
    category: "Jewelry",
    name: "Marble Surface",
    description: "Elegant marble, natural light",
    requiresModel: false,
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "campaign_cosmetics_model",
    category: "Model Campaigns",
    name: "Cosmetics Model Shoot",
    description: "Model interacting with skincare product",
    requiresModel: true,
    image: "https://images.unsplash.com/photo-1515688594390-b649af70d282?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "campaign_premium_ad",
    category: "Model Campaigns",
    name: "Premium Campaign Ad",
    description: "High budget commercial look",
    requiresModel: true,
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

const IMAGE_LIMIT = 10;

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
  const [loadingMessage, setLoadingMessage] = useState("Generating images... This may take a few seconds");
  const [error, setError] = useState<string>("");
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<string[]>([]);
  const [imagesUsed, setImagesUsed] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        } else {
          setSelectedTemplateId("");
        }
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.modelType) setModelType(parsed.modelType);
      } catch (e) {}
    }
  }, []);

  // 1b. Strict Template Match
  useEffect(() => {
    if (selectedTemplateId && !TEMPLATES.find(t => t.id === selectedTemplateId)) {
      setSelectedTemplateId("");
    }
  }, [selectedTemplateId]);

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

  const handleFileUpload = async (file: File) => {
    try {
      console.log("=== UPLOAD START ===")
      console.log("File:", file)

      const { data: { session } } = await supabase.auth.getSession()
      console.log("Session:", session)

      if (!session) {
        throw new Error("User not authenticated")
      }

      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      console.log("Uploading to:", fileName);

      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("UPLOAD ERROR:", error);
        alert("Upload failed");
        return null;
      }

      // ✅ IMPORTANT: use EXACT returned path
      const publicUrl = supabase.storage
        .from("images")
        .getPublicUrl(data.path).data.publicUrl;

      console.log("FINAL PUBLIC URL:", publicUrl);

      return publicUrl;

    } catch (err: any) {
      console.error("FINAL UPLOAD ERROR:", err)

      alert(
        err?.message ||
        JSON.stringify(err) ||
        "Upload failed"
      )

      return null
    }
  }

  const handleInputUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'face' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) {
      alert("No file selected");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be under 10MB");
      return;
    }

    setUploadingState(prev => ({ ...prev, [type]: true }));
    const url = await handleFileUpload(file);
    if (url) {
      if (type === 'product') setProductImage(url);
      if (type === 'face') setFaceImage(url);
      if (type === 'bg') setBackgroundImage(url);
      toast.success(`${type} image uploaded successfully`);
    }
    setUploadingState(prev => ({ ...prev, [type]: false }));
  };

  const handleDownload = (imgUrl: string) => {
    try {
      window.open(imgUrl, "_blank");
    } catch {
      toast.error("Download failed");
    }
  };

  const executeGeneration = async (useLastRequest: boolean = false) => {
    if (isGenerating) return;

    let payload;

    if (useLastRequest && lastRequestRef.current) {
      payload = lastRequestRef.current;
    } else {
      if (!productImage || !productImage.includes("/storage/v1/object/public/images/")) {
        alert("Invalid product image. Upload again.");
        return;
      }

      if (!selectedTemplate) {
        alert("Select a template");
        return;
      }

      if (!isGenerateReady()) return;
      
      if (!currentUser) {
        setError("You must be logged in to generate images.");
        toast.error("Please log in first");
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error("Session expired. Please login again.");
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
        requiresModel: selectedTemplate?.requiresModel || false,
        userId: currentUser.id
      };
      // 3. Save Payload Guarantee for Regenerate
      lastRequestRef.current = payload;
    }

    // Check Limits First (Frontend Double Check)
    if (imagesUsed + payload.imageCount > IMAGE_LIMIT) {
      const errorMsg = "You reached free limit (10 images). Upgrade coming soon 🚀";
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    try {
      setIsGenerating(true);
      setLoadingMessage("Generating images... This may take a few seconds");
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Session expired");
      }

      console.log("SENDING IMAGE:", payload.productImage);
      console.log("🚀 SENDING PAYLOAD:", { prompt: customPrompt || "studio product photoshoot" });

      console.log("🚨 API URL:", import.meta.env.VITE_API_URL);

      const API_URL = "https://product-photoshoot-ai.onrender.com";

      console.log("🚀 FINAL REQUEST:", `${API_URL}/api/generate`);

      const fetchPayload = {
        productImage: payload.productImage,
        template: payload.template,
        prompt: customPrompt || "",
        imageCount: payload.imageCount
      };

      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(fetchPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearTimeout(coldStartTimer);
      clearTimeout(slowTimer);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      
      // DEBUG
      console.log("✅ BACKEND RESPONSE:", data);

      if (!data.success || !data.images) {
        throw new Error(data.error || "Generation failed");
      }

      // ✅ UPDATE UI (CRITICAL LINE)
      setResults(data.images || []);
      
      // 5. Safe Usage Increment
      setImagesUsed(prev => prev + payload.imageCount);
      toast.success("Images generated successfully!");
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setSuccessMessage("");
      setTimeout(() => {
        setSuccessMessage("Generated successfully ✓");
      }, 50);

      timeoutRef.current = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

    } catch (err: any) {
      console.error("❌ ERROR:", err);
      console.error("❌ GENERATION ERROR:", err);
      let errorMsg = err.message || "Generation failed. Try again.";
      if (err.message === "You reached free limit (10 images). Upgrade coming soon 🚀") errorMsg = err.message;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
      setLoadingMessage("Generating images... This may take a few seconds");
    }
  };

  const CompactUploadBox = ({ label, image, onClear, onUpload, uploading, icon: Icon, required }: any) => (
    <div className="w-full">
      {image ? (
        <div className="relative group">
          <img src={image} className="w-full h-32 object-cover rounded-md" />
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div 
          onClick={onUpload}
          className="border border-dashed border-gray-600 rounded-xl p-5 text-center hover:border-blue-500 transition bg-[#111] cursor-pointer flex flex-col items-center justify-center min-h-[100px]"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-gray-400 border-t-white rounded-full animate-spin mb-2" />
          ) : (
            <>
              <Icon className="w-6 h-6 text-gray-400 mb-2" />
              <span className="text-gray-300 text-sm">{label} {required && <span className="text-red-400">*</span>}</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="h-[70px] border-b bg-white flex items-center justify-between px-6 shrink-0 z-30">
        <h2 className="font-bold text-xl tracking-tight text-black">PhotoAI</h2>
        <div className="flex items-center gap-3 ml-auto">
          <label className="text-sm font-medium text-gray-500">Niche:</label>
          <select 
            value={activeCategory} 
            onChange={(e) => { setActiveCategory(e.target.value); setSelectedTemplateId(""); setError(""); }}
            className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </header>

      <div className="flex h-[calc(100vh-70px)]">

        {/* LEFT PANEL */}
        <div className="w-[340px] bg-[#0B0B0F] border-r border-gray-800 p-4 flex flex-col space-y-5 shrink-0 overflow-y-auto custom-scrollbar">
          
          {!selectedTemplate && (
            <p className="text-sm text-gray-400 text-center mt-4">
              Select a template to start
            </p>
          )}

          <div className={cn("space-y-5 transition-opacity duration-200", selectedTemplate ? "opacity-100" : "opacity-60 pointer-events-none")}>
            
            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Model</label>
              <select 
                value={modelType} 
                onChange={(e) => setModelType(e.target.value)}
                className="w-full bg-[#111] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="auto" className="bg-[#0A0A0A] text-white">Auto (Default)</option>
                <option value="flux" className="bg-[#0A0A0A] text-white">Flux (Product-focused)</option>
                <option value="seedream" className="bg-[#0A0A0A] text-white">Seedream (Model-focused)</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">References</label>
              
              <div className="space-y-4">
                <CompactUploadBox 
                  label="Upload Product" 
                  image={productImage} 
                  required
                  icon={Box}
                  onUpload={() => productInputRef.current?.click()} 
                  onClear={() => setProductImage(null)}
                  uploading={uploadingState.product}
                />
                <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInputUpload(e, 'product')} />
                
                {selectedTemplate?.requiresModel && (
                  <div className="bg-[#111] border border-gray-700 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <UserCircle2 className="w-4 h-4 text-gray-400" /> Add Model Face
                      </span>
                      <button 
                        onClick={() => setUseModel(!useModel)}
                        className={cn("w-10 h-5 rounded-full relative transition-colors border border-gray-700", useModel ? "bg-blue-600 border-blue-500" : "bg-gray-800")}
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
                )}
                {selectedTemplate?.requiresModel && (
                  <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInputUpload(e, 'face')} />
                )}

                <CompactUploadBox 
                  label="Upload Background" 
                  image={backgroundImage} 
                  icon={ImageIcon}
                  onUpload={() => bgInputRef.current?.click()} 
                  onClear={() => setBackgroundImage(null)}
                  uploading={uploadingState.bg}
                />
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInputUpload(e, 'bg')} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prompt (Optional)</label>
              <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Customize your scene..."
                rows={2}
                className="w-full bg-[#111] border border-gray-700 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Settings</label>
              <div className="bg-[#111] border border-gray-700 rounded-xl p-3 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Aspect Ratio</span>
                  <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="bg-[#0B0B0F] border border-gray-800 rounded-lg text-gray-300 text-sm px-2 py-1 w-32 focus:outline-none cursor-pointer"
                  >
                    {SIZES.map(s => (
                      <option key={s.label} value={s.label} className="bg-[#0A0A0A]">{s.label} — {s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Image Count</span>
                  <div className="flex items-center bg-[#0B0B0F] border border-gray-800 rounded-lg overflow-hidden h-7 w-24">
                    <button onClick={() => setImageCount(Math.max(1, imageCount - 1))} className="flex-1 hover:bg-gray-800 text-gray-400 hover:text-white">-</button>
                    <span className="w-8 text-sm text-center border-x border-gray-800 text-white flex items-center justify-center h-full">{imageCount}</span>
                    <button onClick={() => setImageCount(Math.max(1, Math.min(4, imageCount + 1)))} className="flex-1 hover:bg-gray-800 text-gray-400 hover:text-white">+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 shrink-0 pb-4">
              <div className="mb-3 text-center">
                <p className="text-gray-400 text-sm">
                  {imagesUsed} / 10 images used
                </p>
              </div>
              
              <button 
                onClick={() => executeGeneration()}
                disabled={!selectedTemplate || !productImage || (selectedTemplate?.requiresModel && !faceImage) || isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> {isGenerating ? "Generating..." : "Generate Photoshoot"}
              </button>
              {!productImage && (
                <p className="text-xs text-red-400 mt-2 text-center">
                  Upload required images to continue
                </p>
              )}
            </div>

          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-y-auto px-8 py-6 w-full custom-scrollbar bg-[#FDFCFB]">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Create Photoshoot</h1>

            {/* Template Section */}
            <div className="mb-6">
              <div className="mb-4 text-sm text-gray-500">
                <span className="font-medium text-black">Step 1:</span> Select a style &rarr;
                <span className="font-medium text-black ml-2">Step 2:</span> Upload images &rarr;
                <span className="font-medium text-black ml-2">Step 3:</span> Generate
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id}
                    onClick={() => { setSelectedTemplateId(template.id); setError(""); }}
                    className={cn(
                      "rounded-xl border p-3 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 bg-white",
                      selectedTemplateId === template.id ? "border-blue-500 shadow-md" : "border-gray-200"
                    )}
                  >
                    <img src={template.image} className="rounded-lg mb-2 w-full object-cover aspect-[4/3]" />
                    <h3 className="font-semibold text-sm">{template.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 px-4 py-4 rounded-xl flex items-center justify-between shadow-sm mt-4">
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
              
              {!isGenerating && results.length === 0 && !error && (
                <div className="text-center text-gray-400 mt-10">
                  <p className="text-lg">No images yet — generate your first photoshoot</p>
                </div>
              )}
            </div>

            {/* Results */}
            <div>
              <AnimatePresence>
                {(isGenerating || results.length > 0) && (
                  <motion.div 
                    id="results"
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
                    className="pt-8 border-t border-gray-200 pb-10"
                  >
                    <h3 className="text-2xl font-semibold mb-6">Generated Results</h3>
                    
                    {successMessage && (
                      <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 text-green-600 text-sm font-medium transition-opacity duration-300">
                        {successMessage}
                      </div>
                    )}
                    
                    {isGenerating && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400 text-center mb-6">
                          {loadingMessage}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                          {[...Array(imageCount)].map((_, i) => (
                            <div key={i} className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-200 animate-pulse aspect-square"></div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isGenerating && results.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                        {results.map((img: any, i) => (
                          <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                            <img src={img} alt="Generated result" className="w-full h-auto object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-3 p-4">
                              <Button onClick={() => handleDownload(img)} className="bg-white text-black hover:bg-gray-100 rounded-full font-bold w-48 shadow-lg">
                                <Download className="w-4 h-4 mr-2" /> Download
                              </Button>
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
          </div>
        </div>

      </div>
    </div>
  );
}
