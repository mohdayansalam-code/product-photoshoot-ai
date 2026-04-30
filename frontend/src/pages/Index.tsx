import { Camera, FolderOpen, Images, Plus, Sparkles, Download, Eye, LayoutTemplate, Store, Instagram, Globe } from "lucide-react";
import { demoImages } from "@/data/demoImages";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const API_URL = import.meta.env.VITE_API_URL || "https://product-photoshoot-ai.onrender.com";
        const res = await fetch(`${API_URL}/api/images`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        
        if (data.images) {
          setGenerations(data.images);
        }
      } catch (err) {
        console.error("Failed to load generations for dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  const handleDownload = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast({ title: "Starting download..." });
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `photoai-export-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const recentGenerations = generations.slice(0, 4);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-12">
      
      {/* 1. HERO ACTION SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 md:p-12 text-center flex flex-col items-center justify-center space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500" />
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-2">
          <Sparkles className="w-8 h-8 text-blue-500" />
        </div>
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Create Product Photos in Seconds
          </h1>
          <p className="text-lg md:text-xl text-gray-500">
            Upload your product and generate high-converting, professional images instantly without a studio.
          </p>
        </div>
        <Button 
          onClick={() => navigate("/dashboard/create-photoshoot")} 
          size="lg" 
          className="h-16 px-10 text-lg rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all hover:scale-105 mt-4"
        >
          <Plus className="w-6 h-6 mr-2" /> Generate Photoshoot
        </Button>
      </motion.div>

      {/* 2. QUICK USE-CASES (PRESETS) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
          <LayoutTemplate className="w-5 h-5 text-gray-400" /> Quick Start Presets
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Preset 1 */}
          <div 
            onClick={() => navigate("/dashboard/create-photoshoot?preset=amazon")}
            className="group cursor-pointer bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 hover:border-blue-200"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              <img src={demoImages[4].src} alt="Amazon Listing" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Store className="w-4 h-4 text-blue-500" />
                <h3 className="font-bold text-gray-900">Amazon Listing</h3>
              </div>
              <p className="text-sm text-gray-500 leading-snug">Clean white background, marketplace ready</p>
            </div>
          </div>

          {/* Preset 2 */}
          <div 
            onClick={() => navigate("/dashboard/create-photoshoot?preset=instagram")}
            className="group cursor-pointer bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 hover:border-blue-200"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              <img src={demoImages[2].src} alt="Instagram Ads" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Instagram className="w-4 h-4 text-pink-500" />
                <h3 className="font-bold text-gray-900">Instagram Ads</h3>
              </div>
              <p className="text-sm text-gray-500 leading-snug">Eye-catching lifestyle scenes for social</p>
            </div>
          </div>

          {/* Preset 3 */}
          <div 
            onClick={() => navigate("/dashboard/create-photoshoot?preset=website")}
            className="group cursor-pointer bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4 hover:border-blue-200"
          >
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              <img src={demoImages[7].src} alt="Website Banner" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Globe className="w-4 h-4 text-purple-500" />
                <h3 className="font-bold text-gray-900">Website Banner</h3>
              </div>
              <p className="text-sm text-gray-500 leading-snug">Wide 16:9 premium editorial composition</p>
            </div>
          </div>

        </div>
      </motion.div>

      {/* 3. RECENT GENERATIONS (SMART) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <Images className="w-5 h-5 text-gray-400" /> Recent Generations
          </h2>
          {generations.length > 4 && (
            <Button variant="ghost" asChild className="text-blue-600 hover:text-blue-700">
              <Link to="/dashboard/assets">View library</Link>
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(idx => (
               <div key={idx} className="aspect-[4/5] rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : recentGenerations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
               <Camera className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">No photos yet</h3>
            <p className="text-gray-500 max-w-sm mb-6">Your recent AI photoshoots will appear here automatically.</p>
            <Button onClick={() => navigate("/dashboard/create-photoshoot")} className="rounded-full px-6 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Create your first photoshoot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recentGenerations.map((gen, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={gen.id} 
                onClick={() => window.open(gen.image_url, '_blank')}
                className="group cursor-pointer relative aspect-[4/5] rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
              >
                <img 
                  src={gen.image_url} 
                  onError={(e) => e.currentTarget.style.display = "none"}
                  alt="Generation" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                
                <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px] gap-3">
                  <Button 
                    variant="secondary" 
                    className="bg-white text-black hover:bg-gray-100 rounded-full font-bold shadow-lg"
                    onClick={(e) => handleDownload(gen.image_url, e)}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:text-white hover:bg-white/20 rounded-full"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                </div>

                <div className="absolute top-3 left-3">
                  <p className="bg-black/50 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-md border border-white/10">
                    {format(new Date(gen.created_at), "MMM d")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* 4. MINI LIBRARY SHORTCUT */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="pt-4"
      >
        <Link to="/dashboard/assets" className="block group">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all hover:border-blue-200">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                 <FolderOpen className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-bold text-lg text-gray-900">Saved Assets Library</h3>
                  <p className="text-sm text-gray-500">View, download, and manage all your generated photos</p>
               </div>
             </div>
             <Button variant="outline" className="shrink-0 rounded-full group-hover:bg-gray-50">
               Go to Library
             </Button>
          </div>
        </Link>
      </motion.div>
      
    </div>
  );
}
