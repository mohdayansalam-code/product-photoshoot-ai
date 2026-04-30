import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FolderOpen, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridSkeleton } from "@/components/ui/SkeletonViews";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function AssetsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [images, setImages] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
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
          setImages(data.images);
        }
      } catch (e: any) {
        console.error("Failed to load images", e);
        toast({ title: "Failed to load images", description: e.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [toast]);

  const getDaysRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const handleDownload = async (url: string) => {
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Assets Library</h1>
        </div>
        <p className="text-sm text-gray-500">View and manage your generated photos. Images auto-delete after 3 days.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
           <div className="pt-4"><GridSkeleton count={8} /></div>
        ) : images.length === 0 ? (
           <motion.div
             key="empty"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex flex-col items-center justify-center py-24 bg-gray-50 border border-dashed border-gray-200 rounded-2xl mt-8"
           >
             <Package className="h-12 w-12 text-gray-300 mb-4" />
             <h3 className="text-lg font-semibold text-gray-900">No images found</h3>
             <p className="text-sm text-gray-500 max-w-sm text-center mt-2">
                Generate a photoshoot and your photos will appear here.
             </p>
           </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8"
          >
            {images.map((asset, i) => {
              const daysLeft = getDaysRemaining(asset.expires_at);
              return (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                    <img src={asset.image_url} alt="Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    
                    <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-100">
                      <div className="bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-white/10 shadow-sm">
                        <Clock className={`w-3.5 h-3.5 ${daysLeft <= 1 ? 'text-red-400' : 'text-blue-400'}`} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-black/40 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                      <Button 
                        variant="secondary" 
                        className="bg-white text-black hover:bg-gray-100 rounded-full font-bold shadow-lg"
                        onClick={() => handleDownload(asset.image_url)}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">
                      Generated: {new Date(asset.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
