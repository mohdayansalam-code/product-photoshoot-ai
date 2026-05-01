import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
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


const CATEGORIES = ["Fashion", "Cosmetics", "Jewelry", "Model Campaigns"];

const PRESETS: Record<string, any> = {
  amazon: {
    name: "Amazon Listing",
    prompt: "clean white background, product centered, soft shadow, ecommerce style, high clarity, no distractions",
    aspectRatio: "1:1",
    model: "gpt",
  },
  instagram: {
    name: "Instagram Ads",
    prompt: "colorful background, lifestyle scene, modern lighting, trendy aesthetic, social media style",
    aspectRatio: "4:5",
    model: "seedream",
  },
  website: {
    name: "Website Banner",
    prompt: "premium product banner, soft lighting, minimal background, luxury feel, high resolution",
    aspectRatio: "16:9",
    model: "gpt",
  }
};

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
  const [searchParams] = useSearchParams();
  const presetKey = searchParams.get("preset");
  const activePreset = presetKey && PRESETS[presetKey] ? PRESETS[presetKey] : null;

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>("Cosmetics");
  
  // Selections
  
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
  const [session, setSession] = useState<any>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Auth Fetch
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setCurrentUser(session?.user || null);
        setIsAuthChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setCurrentUser(session?.user || null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUsage = async () => {
    if (!session?.access_token) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || "https://product-photoshoot-ai.onrender.com";
      const res = await fetch(`${API_URL}/api/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      console.log("FRONTEND USAGE:", data);
      setUsage(data.used);
    } catch (err) {
      console.error("Failed to fetch usage", err);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [session?.access_token]);


  // Safety & Recovery Refs
  const lastRequestRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const generateRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // 1. Local Storage Safe Load
  useEffect(() => {
    const saved = localStorage.getItem("photoshoot_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.aspectRatio) setAspectRatio(parsed.aspectRatio);
        if (parsed.modelType) setModelType(parsed.modelType);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (activePreset) {
      setCustomPrompt(activePreset.prompt);
      setAspectRatio(activePreset.aspectRatio);
      setSelectedModel(activePreset.model);
    }
  }, [activePreset]);

  // Auto Scroll to Generate
  useEffect(() => {
    if (activePreset || productImage) {
      setTimeout(() => {
        generateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [activePreset, productImage]);

  // 2. Local Storage Safe Save
  useEffect(() => {
    localStorage.setItem("photoshoot_settings", JSON.stringify({
      aspectRatio,
      modelType
    }));
  }, [aspectRatio, modelType]);

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

  const isGenerateReady = () => {
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
        .getPublicUrl(fileName);

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

    if (!productImage || !productImage.startsWith("https://")) {
      alert("Invalid image URL");
      return;
    }

    let payload;

    if (useLastRequest && lastRequestRef.current) {
      payload = { ...lastRequestRef.current, ...options };
    } else {

      if (!customPrompt || customPrompt.trim().length < 10) {
        alert("Enter valid prompt");
        return;
      }

      if (useModel && !faceImage) {
        toast.error("Upload model face or turn OFF model");
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
        template: activeCategory.toLowerCase(),
        productImage,
        faceImage: useModel ? faceImage : null,
        backgroundImage,
        aspectRatio,
        imageCount,
        customPrompt,
        modelType,
        requiresModel: useModel,
        userId: currentUser.id,
        model: selectedModel,
        category: activeCategory.toLowerCase()
      };
      // 3. Save Payload Guarantee for Regenerate
      lastRequestRef.current = payload;
    }

    // Check Limits First (Frontend Double Check)
    if (usage !== null && usage + payload.imageCount > 10) {
      const errorMsg = `Monthly limit reached (10 images)`;
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

      console.log("FINAL IMAGE URL:", productImage);
      console.log("🚀 SENDING PAYLOAD:", { prompt: payload.customPrompt || customPrompt || "studio product photoshoot" });

      console.log("🚨 API URL:", import.meta.env.VITE_API_URL);

      const API_URL = "https://product-photoshoot-ai.onrender.com";

      console.log("🚀 FINAL REQUEST:", `${API_URL}/api/generate`);

      const fetchPayload = {
        prompt: payload.customPrompt || customPrompt || "",
        imageUrl: productImage,
        model: selectedModel === "gpt" ? "gpt" : "seedream",
        imageCount: imageCount
      };

      console.log("FINAL PAYLOAD:", {
        prompt: fetchPayload.prompt,
        imageUrl: fetchPayload.imageUrl,
        model: fetchPayload.model,
        imageCount: fetchPayload.imageCount
      });

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
      
      // 5. Safe Usage Update (Fetch from backend)
      await fetchUsage();
      toast.success("✨ Your photos are ready!");
      
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
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const handleDownloadAll = async () => {
    toast.success("Starting download of all images...");
    for (let i = 0; i < results.length; i++) {
      await handleDownload(results[i].url || results[i]);
      await new Promise(r => setTimeout(r, 500));
    }
  };

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
        <h2 className="font-bold text-xl tracking-tight text-black flex items-center gap-3">
          PhotoAI
          {activePreset && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">
              Preset: {activePreset.name}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-3 ml-auto">
          <label className="text-sm font-medium text-gray-500">Niche:</label>
          <select 
            value={activeCategory} 
            onChange={(e) => { setActiveCategory(e.target.value); setError(""); }}
            className="bg-gray-50 border border-gray-200 rounded-lg text-sm px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </header>

      <div className="flex h-[calc(100vh-70px)]">

        {/* LEFT PANEL */}
        <div className="w-[340px] bg-[#0B0B0F] border-r border-gray-800 p-4 flex flex-col space-y-5 shrink-0 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-5 transition-opacity duration-200 opacity-100">
            
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
                    <option value="seedream" className="bg-[#0A0A0A]">Seedream (Fast)</option>
                    <option value="gpt" className="bg-[#0A0A0A]">GPT Image (High Quality)</option>
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
              </div>
            </div>
            <div className="pt-2 shrink-0 pb-4">
              <div className="mb-3 text-center">
                <p className="text-gray-400 text-sm">
                  {usage !== null ? `${usage} / 10 images used this month` : "Loading limits..."}
                </p>
                <p className="text-[10px] text-yellow-600 mt-1.5 font-medium tracking-wide uppercase">Upload clean product image for best results</p>
              </div>
              
              <div className="group relative">
                <button 
                  ref={generateRef}
                  onClick={() => executeGeneration()}
                  disabled={isGenerating || !isGenerateReady()}
                  className={`w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-4 font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isGenerating ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                >
                  <Sparkles className="w-5 h-5" /> {isGenerating ? "Generating..." : "Generate Photoshoot"}
                </button>
                {(!isGenerateReady()) && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Upload product to continue
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1 w-full overflow-y-auto px-8 py-6 custom-scrollbar bg-[#FDFCFB]" ref={resultsRef}>
          <div className="generation-area h-full flex flex-col items-center justify-center">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-6"></div>
                <div className="loading-state space-y-2">
                  <p className="text-2xl font-bold text-gray-900">Generating your photos...</p>
                  <p className="text-lg text-gray-500">This takes ~10–20 seconds</p>
                </div>
              </div>
            )}
            
            {!isGenerating && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-2xl font-bold text-gray-900 mb-2">No images yet</p>
                <p className="text-lg text-gray-500">Upload your product and click Generate</p>
              </div>
            ) : !isGenerating && (
              <div className="w-full flex flex-col gap-6">
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    ✨ Your photos are ready!
                  </h3>
                  <Button onClick={handleDownloadAll} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 font-bold">
                    <Download className="w-4 h-4 mr-2" /> Download All
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 w-full h-fit pb-12">
                  {results.map((img: any, i: number) => (
                    <div key={i} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 bg-white aspect-[4/5]">
                      <img src={img.url || img} alt="Generated result" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-[2px] gap-3 p-4 z-20">
                        <Button onClick={() => handleDownload(img.url || img)} className="bg-white text-black hover:bg-gray-100 rounded-full font-bold w-full max-w-[200px] shadow-lg text-sm h-10 transition-transform hover:scale-105">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                        <Button onClick={() => executeGeneration(true)} variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 border-none rounded-full font-bold w-full max-w-[200px] shadow-lg text-sm h-10 transition-transform hover:scale-105">
                          <RefreshCw className="w-4 h-4 mr-2" /> Regenerate Similar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
