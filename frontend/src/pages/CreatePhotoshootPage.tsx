import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  X, 
  Sparkles,
  Download,
  Image as ImageIcon,
  UserCircle2,
  Box,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// --- TEMPLATES DATA ---
const TEMPLATES = [
  // Fashion
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
  // Cosmetics
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
  // Jewelry
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
  // Model Campaigns
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

// --- COMPONENTS ---

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
  
  // Toggles
  const [forceAddModel, setForceAddModel] = useState(false);

  // Status
  const [loading, setLoading] = useState(false);
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Refs
  const productInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = TEMPLATES.filter(t => t.category === activeCategory);

  const isModelInputVisible = selectedTemplate?.requiresModel || forceAddModel;
  
  const isGenerateReady = () => {
    if (!selectedTemplate) return false;
    if (!productImage) return false;
    if (isModelInputVisible && !faceImage) return false;
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

  const executeGeneration = async () => {
    if (!isGenerateReady()) return;
    
    try {
      setLoading(true);
      setGeneratedImages([]);

      const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://product-photoshoot-ai.onrender.com";
      const exactFetchUrl = `${API_BASE}/api/generate`;

      const payload = {
        template: selectedTemplateId,
        productImage,
        faceImage: isModelInputVisible ? faceImage : undefined,
        backgroundImage
      };

      const res = await fetch(exactFetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);

      const data = await res.json();
      if (!data || !data.success || !data.images) throw new Error("Generation failed on backend");

      setGeneratedImages(data.images);
      toast.success("Photoshoot ready!");
      
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);

    } catch (err: any) {
      console.error("🔥 ERROR:", err);
      toast.error(`Generation failed. Please try again.`);
    } finally {
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

  // UI Components
  const UploadBox = ({ 
    type, 
    label, 
    required, 
    image, 
    onClear, 
    onUpload, 
    uploading, 
    icon: Icon 
  }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center px-1">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-gray-500" /> {label}
          {required && <span className="text-red-500">*</span>}
        </label>
        {image && (
          <button onClick={onClear} className="text-xs text-red-500 hover:underline">
            Remove
          </button>
        )}
      </div>
      <div 
        onClick={onUpload}
        className={cn(
          "w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
          image ? "border-transparent bg-gray-50" : "border-gray-200 hover:border-black hover:bg-gray-50",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        {uploading ? (
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : image ? (
          <>
            <img src={image} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <span className="text-white text-xs font-medium">Replace</span>
            </div>
          </>
        ) : (
          <>
             <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
               <Upload className="w-4 h-4 text-gray-600" />
             </div>
             <span className="text-xs text-gray-500 font-medium">Drag & drop or click</span>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-slate-900 font-sans flex flex-col">
      {/* Header (optional if covered by global layout, but good for SaaS feel) */}
      <header className="h-16 border-b bg-white flex items-center px-6 lg:px-10 shrink-0 sticky top-0 z-40">
        <h1 className="font-bold text-xl tracking-tight">Create Photoshoot</h1>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT SIDEBAR: Category Navigation */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r bg-white p-6 shrink-0 lg:h-[calc(100vh-4rem)] lg:sticky top-16 overflow-y-auto">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Categories</h2>
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSelectedTemplateId(""); }}
                className={cn(
                  "px-4 py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap flex items-center justify-between",
                  activeCategory === cat 
                    ? "bg-black text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {cat}
                {cat === "Model Campaigns" && <Sparkles className={cn("w-4 h-4", activeCategory === cat ? "text-yellow-400" : "text-amber-500")} />}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT: Template Grid */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto lg:h-[calc(100vh-4rem)]">
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold">{activeCategory} Templates</h2>
              <p className="text-gray-500 mt-1">Select a style for your product photoshoot</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={cn(
                    "group relative bg-white rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                    selectedTemplateId === template.id 
                      ? "border-black shadow-lg ring-4 ring-black/5" 
                      : "border-transparent shadow-sm hover:border-gray-200"
                  )}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden relative">
                    <img src={template.image} alt={template.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {template.premium && (
                      <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider">
                        <Crown className="w-3 h-3" /> Pro
                      </div>
                    )}
                    {selectedTemplateId === template.id && (
                       <div className="absolute inset-0 bg-black/10 border-4 border-black rounded-xl transition-all" />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900">{template.label}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{template.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Results Section */}
            <AnimatePresence>
              {(loading || generatedImages.length > 0) && (
                <motion.div 
                  id="results"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} 
                  className="pt-16 border-t border-gray-200 mt-16 pb-32"
                >
                  <h3 className="text-2xl font-bold mb-8">Generated Results</h3>
                  
                  {loading && (
                    <div className="py-20 flex flex-col items-center justify-center space-y-5 bg-white rounded-3xl border border-gray-100 shadow-sm">
                      <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                      <p className="text-gray-500 animate-pulse font-medium">Crafting your professional photoshoot...</p>
                    </div>
                  )}

                  {!loading && generatedImages.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {generatedImages.map((img, i) => (
                        <div key={i} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                          <img src={img} alt="Generated result" className="w-full h-auto object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <Button onClick={() => downloadImage(img)} className="bg-white text-black hover:bg-gray-100 rounded-full font-bold px-6">
                              <Download className="w-4 h-4 mr-2" /> Download HQ
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

        {/* RIGHT PANEL: Sticky Upload & Generate */}
        <aside className="w-full lg:w-[340px] xl:w-[400px] border-t lg:border-t-0 lg:border-l bg-white p-6 shrink-0 lg:h-[calc(100vh-4rem)] lg:sticky top-16 overflow-y-auto shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="space-y-8">
            
            <div>
              <h2 className="text-lg font-bold">Configure Inputs</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedTemplate 
                  ? `For: ${selectedTemplate.label}` 
                  : "Select a template first"}
              </p>
            </div>

            <div className={cn("space-y-6 transition-opacity duration-300", !selectedTemplate && "opacity-40 pointer-events-none grayscale")}>
              
              {/* Product Upload */}
              <UploadBox 
                type="product" 
                label="Product Image" 
                required={true}
                image={productImage} 
                icon={Box}
                onClear={() => setProductImage(null)} 
                onUpload={() => productInputRef.current?.click()} 
                uploading={uploadingState.product} 
              />
              <input ref={productInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />

              {/* Dynamic Model Face Upload */}
              <AnimatePresence mode="popLayout">
                {isModelInputVisible && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="pt-2">
                      <UploadBox 
                        type="face" 
                        label="Model Face" 
                        required={true}
                        image={faceImage} 
                        icon={UserCircle2}
                        onClear={() => setFaceImage(null)} 
                        onUpload={() => faceInputRef.current?.click()} 
                        uploading={uploadingState.face} 
                      />
                      <input ref={faceInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'face')} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Background Upload (Optional) */}
              <UploadBox 
                type="bg" 
                label="Background Ref (Optional)" 
                required={false}
                image={backgroundImage} 
                icon={ImageIcon}
                onClear={() => setBackgroundImage(null)} 
                onUpload={() => bgInputRef.current?.click()} 
                uploading={uploadingState.bg} 
              />
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'bg')} />

              {/* Toggle to add model if template doesn't require it */}
              {selectedTemplate && !selectedTemplate.requiresModel && (
                <button 
                  onClick={() => setForceAddModel(!forceAddModel)}
                  className="w-full text-left text-sm font-medium text-black hover:underline flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  {forceAddModel ? "- Remove Model Face" : "+ Add Model Face"}
                </button>
              )}

            </div>

            <div className="pt-4 border-t border-gray-100">
              <Button 
                onClick={executeGeneration}
                disabled={loading || !isGenerateReady()}
                className="w-full h-14 text-base font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50"
                style={{
                  background: isGenerateReady() && !loading ? 'linear-gradient(to right, #000000, #333333)' : undefined
                }}
              >
                {loading ? (
                   <span className="flex items-center gap-2">
                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     Generating...
                   </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Generate Image
                  </span>
                )}
              </Button>
              {!isGenerateReady() && selectedTemplate && (
                <p className="text-center text-xs text-red-500 mt-3 font-medium">
                   Please upload all required images.
                </p>
              )}
            </div>

          </div>
        </aside>

      </div>
    </div>
  );
}
