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
  AlertCircle,
  ThumbsUp,
  ThumbsDown
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
  const [imageCount, setImageCount] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [selectedModel, setSelectedModel] = useState("gpt");
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  // Status & Limits
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Generating premium images...");
  const [error, setError] = useState<string>("");
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Auth & Usage Fetch
  useEffect(() => {
    let mounted = true;
    const fetchAuthAndUsage = async (session: any) => {
      if (session?.user) {
        if (mounted) setCurrentUser(session.user);
        
        // Fetch usage
        try {
          const API_URL = import.meta.env.VITE_API_URL || "https://product-photoshoot-ai.onrender.com";
          const res = await fetch(`${API_URL}/api/usage`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (mounted) setUsage(data);
          }
        } catch (e) {
          console.error("Failed to fetch usage", e);
        }
      } else {
        if (mounted) setCurrentUser(null);
        if (mounted) setUsage(null);
      }
      if (mounted) setIsAuthChecking(false);
    };

    // Initial Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchAuthAndUsage(session);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchAuthAndUsage(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

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
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large");
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

  const handleDownload = async (imgUrl: string) => {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "generated-image.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  const executeGeneration = async (useLastRequest: boolean = false, options: { varyStyle?: boolean; improveQuality?: boolean } = {}) => {
    if (isGenerating) return;

    let payload;

    if (useLastRequest && lastRequestRef.current) {
      payload = { ...lastRequestRef.current, ...options };
    } else {
      if (!productImage) {
        toast.error("Upload product image");
        return;
      }

      if (useModel && !faceImage) {
        toast.error("Upload model face or turn OFF model");
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
        userId: currentUser.id,
        model: selectedModel,
        category: activeCategory.toLowerCase()
      };
      // 3. Save Payload Guarantee for Regenerate
      lastRequestRef.current = payload;
    }

    // Check Limits First (Frontend Double Check)
    if (usage !== null && usage.used + payload.imageCount > usage.limit) {
      const errorMsg = `Daily limit reached (${usage.used}/${usage.limit} used today).`;
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    let messageInterval: NodeJS.Timeout | null = null;
    try {
      setIsGenerating(true);
      const messages = [
        "Creating your product photos...",
        "Optimizing for ecommerce quality...",
        "Applying premium lighting..."
      ];
      setLoadingMessage(messages[0]);
      setError("");
      
      messageInterval = setInterval(() => {
        setLoadingMessage(prev => {
          const currentIndex = messages.indexOf(prev);
          const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % messages.length;
          return messages[nextIndex];
        });
      }, 2500);
      
      // Mobile UX Fix: Close drawer immediately
      if (isMobilePanelOpen) setIsMobilePanelOpen(false);

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
        imageCount: payload.imageCount,
        model: payload.model || "gpt",
        category: payload.category || activeCategory.toLowerCase(),
        varyStyle: payload.varyStyle,
        improveQuality: payload.improveQuality,
        modelFace: payload.faceImage,
        backgroundImage: payload.backgroundImage,
        useModel: useModel,
        aspectRatio: payload.aspectRatio
      };

      const response = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(fetchPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      
      // DEBUG
      console.log("✅ BACKEND RESPONSE:", data);

      if (!data.success || !data.images || data.images.length === 0) {
        throw new Error("No images generated");
      }

      // ✅ UPDATE UI (CRITICAL LINE)
      setResults(prev => [...prev, ...(data.images || [])]);

      if (data.images && data.images.length < payload.imageCount) {
        alert(`Only ${data.images.length} images generated. Try again for full set.`);
      }
      
      // 5. Safe Usage Update (Local fallback, backend handles real deduction)
      setUsage(prev => prev ? { ...prev, used: prev.used + data.images.length } : null);
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
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
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
      setLoadingMessage("Generating ecommerce + ad version...");
      if (messageInterval) clearInterval(messageInterval);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setIsAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: { emailRedirectTo: window.location.origin + "/dashboard/generate" }
    });
    setIsAuthLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the login link");
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + "/dashboard/generate" } });
  };

  if (isAuthChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to PhotoAI</h2>
            <p className="text-gray-500 text-sm">Sign in to generate professional product photos.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required
              />
            </div>
            <Button type="submit" disabled={isAuthLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium">
              {isAuthLoading ? "Sending link..." : "Continue with Email"}
            </Button>
          </form>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px bg-gray-200 flex-1"></div>
            <span className="text-sm text-gray-400">or</span>
            <div className="h-px bg-gray-200 flex-1"></div>
          </div>
          <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-12 mt-6 rounded-xl font-medium flex items-center justify-center gap-2 border-gray-200 text-gray-900 bg-white hover:bg-gray-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
        </div>
      </div>
    );
  }

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
                <p className="text-[10px] text-gray-500 italic mt-1 text-center">👉 Upload clean product image with simple background</p>
                <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInputUpload(e, 'product')} />
                
                <div className="bg-[#111] border border-gray-700 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm flex items-center gap-2">
                      <UserCircle2 className="w-4 h-4 text-gray-400" /> Use Model
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
                          label="Upload Model Face" 
                          image={faceImage} 
                          required={useModel}
                          icon={UserCircle2}
                          onUpload={() => faceInputRef.current?.click()} 
                          onClear={() => setFaceImage(null)}
                          uploading={uploadingState.face}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleInputUpload(e, 'face')} />
                </div>

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
                  <span className="text-gray-300 text-sm">Model</span>
                  <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-[#0B0B0F] border border-gray-800 rounded-lg text-gray-300 text-sm px-2 py-1 w-40 focus:outline-none cursor-pointer"
                  >
                    <option value="gpt" className="bg-[#0A0A0A]">High Accuracy (slower)</option>
                    <option value="seedream" className="bg-[#0A0A0A]">Creative (faster)</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Image Count</span>
                  <select 
                    value={imageCount} 
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="bg-[#0B0B0F] border border-gray-800 rounded-lg text-gray-300 text-sm px-2 py-1 w-40 focus:outline-none cursor-pointer"
                  >
                    <option value={1} className="bg-[#0A0A0A]">1 Image</option>
                    <option value={2} className="bg-[#0A0A0A]">2 Images</option>
                    <option value={3} className="bg-[#0A0A0A]">3 Images</option>
                    <option value={4} className="bg-[#0A0A0A]">4 Images</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Aspect Ratio</span>
                  <div className="flex items-center gap-1 bg-[#0B0B0F] border border-gray-800 rounded-lg p-1">
                    {['1:1', '4:5', '16:9'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setAspectRatio(ratio)}
                        className={cn(
                          "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                          aspectRatio === ratio
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                        )}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 shrink-0 pb-4">
              <div className="mb-3 text-center">
                <p className="text-gray-400 text-sm">
                  {usage !== null ? `${usage.used} / ${usage.limit} images used today` : "Loading limits..."}
                </p>
                <p className="text-[10px] text-yellow-600 mt-1.5 font-medium tracking-wide uppercase">Upload clean product image for best results</p>
              </div>
              
              <button 
                onClick={() => executeGeneration()}
                disabled={isGenerating || !selectedTemplate || !productImage || (useModel && !faceImage)}
                className={`w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Sparkles className="w-4 h-4" /> {isGenerating ? "Generating..." : "Generate Product Photos"}
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
            <div className="mb-10 text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest mb-4">
                Loved by 500+ creators
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6 max-w-3xl leading-tight">
                Turn your product photos into professional ads instantly
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /> No photoshoot needed</span>
                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /> No editing skills required</span>
                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" /> Generate high-quality product images in seconds</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-1">Fashion</h3>
                <p className="text-xs text-gray-500">Create lifestyle shots for clothing & accessories</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-1">Cosmetics</h3>
                <p className="text-xs text-gray-500">Generate clean, premium skincare visuals</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm text-center">
                <h3 className="font-bold text-gray-900 mb-1">Jewelry</h3>
                <p className="text-xs text-gray-500">Highlight shine, reflections, and luxury detail</p>
              </div>
            </div>

            {/* Template Section */}
            <div className="mb-6">

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
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h3 className="text-2xl font-semibold">Generated Results</h3>
                      {!isGenerating && results.length > 0 && (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Optimized for ecommerce quality</span>
                        </div>
                      )}
                    </div>
                    
                    {successMessage && (
                      <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 text-green-600 text-sm font-medium transition-opacity duration-300">
                        {successMessage}
                      </div>
                    )}
                    
                    {isGenerating && (
                      <div className="flex flex-col items-center justify-center py-10 border border-gray-200 rounded-xl bg-gray-50/50 my-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-lg font-medium text-gray-900">
                          {loadingMessage}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          This may take 10–20 seconds
                        </p>
                      </div>
                    )}

                    {!isGenerating && results.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                        {results.map((img: any, i) => (
                          <div key={i} className="flex flex-col gap-3">
                            <div className="flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest gap-2 mb-1">
                               <span>From this</span>
                               <span className="text-gray-300">→</span>
                               <span className="text-blue-600">To this in seconds</span>
                            </div>
                            <div className="flex gap-2">
                              {/* Before Image */}
                              <div className="w-1/3 relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white flex-shrink-0 flex items-center justify-center p-2">
                                <img src={productImage as string} alt="Original product" className="w-full h-full object-contain opacity-80" />
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm">Raw</div>
                              </div>
                              
                              {/* After Image */}
                              <div className="w-2/3 relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                                <img src={img.url || img} alt="Generated result" className="w-full h-full object-cover" />
                                
                                <div className="absolute top-2 right-2 flex justify-center opacity-100 pointer-events-none z-10">
                                  <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-md text-center backdrop-blur-sm border border-white/10 shadow-sm truncate">
                                    {i === 0 ? "Accurate Product Image" : i === 1 ? "Creative Marketing Version" : `Variation ${i+1}`}
                                  </span>
                                </div>

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm gap-3 p-4 z-20">
                                  <Button onClick={() => handleDownload(img.url || img)} className="bg-white text-black hover:bg-gray-100 rounded-full font-bold w-full max-w-[200px] shadow-lg text-xs h-9">
                                    <Download className="w-4 h-4 mr-2" /> Download
                                  </Button>
                                  <Button onClick={() => executeGeneration(true, { varyStyle: true })} className="bg-blue-600 text-white hover:bg-blue-500 rounded-full font-bold w-full max-w-[200px] shadow-lg text-xs h-9 px-2">
                                    <RefreshCw className="w-3 h-3 mr-1.5" /> Try different style
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="px-1 flex flex-col gap-1.5">
                              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                {img.type === "ecommerce" ? "Clean Ecommerce Version" : img.type === "creative" ? "Creative Ad Version" : "Generated Result"}
                              </span>
                              <p className="text-[11px] text-gray-500">
                                {img.type === "ecommerce" 
                                  ? "Optimized for product accuracy and minimal background." 
                                  : img.type === "creative" 
                                    ? "Enhanced with premium commercial lighting and styling."
                                    : "Generated product variant."}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button onClick={() => toast.success("Thanks for the feedback!")} variant="outline" size="sm" className="h-7 text-xs font-semibold rounded-full border-gray-200">
                                  <ThumbsUp className="w-3 h-3 mr-1.5 text-green-600" /> Good result
                                </Button>
                                <Button onClick={() => executeGeneration(true, { improveQuality: true })} variant="outline" size="sm" className="h-7 text-xs font-semibold rounded-full border-gray-200 hover:bg-red-50 hover:text-red-700">
                                  <ThumbsDown className="w-3 h-3 mr-1.5 text-red-600" /> Improve result
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!isGenerating && results.length > 0 && (
                      <div className="text-center mt-12 pt-8 border-t border-gray-100">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full">
                          <Crown className="w-4 h-4 text-yellow-500" />
                          <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Ready for Shopify, Ads, and Social Media
                          </p>
                        </div>
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
