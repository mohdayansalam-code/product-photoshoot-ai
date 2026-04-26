import { motion } from "framer-motion";
import { getGenerations } from "@/lib/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Eye, Images, RefreshCw, FolderOpen, Loader2 } from "lucide-react";
import { retryGeneration, uploadAsset } from "@/lib/api";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const fetchGens = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (data || []).map(dbGen => ({
         id: dbGen.id,
         prompt: dbGen.template,
         model: "Photoshoot", // Or extract from payload if saved
         created_at: dbGen.created_at,
         status: "completed",
         image_urls: dbGen.image_urls || [],
         images: dbGen.image_urls || []
      }));

      setGenerations(formatted);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load generations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGens();
  }, []);

  const handleRetry = async (id: string) => {
    // 4. CROSS-TAB SAFETY: Store retry lock in localStorage protecting concurrency globally
    const lockKey = `retry_lock_${id}`;
    const lastLock = localStorage.getItem(lockKey);
    if (lastLock && Date.now() - parseInt(lastLock) < 5000) {
      toast.error("Retry already in progress in another window.");
      return;
    }
    localStorage.setItem(lockKey, Date.now().toString());

    setRetrying(prev => ({ ...prev, [id]: true }));
    try {
      const result = await retryGeneration(id);
      if (result && result.image_url) {
        toast.success("Your previous photoshoot completed successfully and 1 credit was used.", { description: "Late-success image recovered." });
        
        // 5. UI UPDATE: Replace failed card instantly on recovery
        setGenerations(prev => prev.map(g => g.id === id ? { 
           ...g, 
           status: "completed", 
           recovered: true, 
           image_urls: [result.image_url], 
           images: [result.image_url] 
        } : g));
        
        // Broadcast global state synchronization hooking Credit Indicator!
        window.dispatchEvent(new Event("sync_credits"));
      }
    } catch (error: any) {
      toast.error("Retry failed. Generation still processing or permanently dropped.");
    } finally {
      setTimeout(() => {
        setRetrying(prev => ({ ...prev, [id]: false }));
      }, 3000); // 2. RETRY PROTECTION: 3-second cooldown globally
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

  const handleDownloadAll = async (urls: string[]) => {
    if (!urls || urls.length === 0) return;
    toast.success(`Downloading ${urls.length} images...`);
    for (const url of urls) {
       await downloadImage(url);
    }
  };

  const handleSaveToAssets = async (urls: string[]) => {
     if (!urls || urls.length === 0) return;
     toast.success("Saving to assets...");
     try {
       for (const url of urls) {
          const res = await fetch(url);
          const blob = await res.blob();
          await uploadAsset(blob);
       }
       toast.success("Saved to assets");
     } catch (err: any) {
       toast.error("Failed to save to assets: " + err.message);
     }
  };

  const getStatusColor = (status: string) => {
     if (status === "completed") return "bg-green-100 text-green-700 border-green-200";
     if (status?.includes("failed")) return "bg-red-100 text-red-700 border-red-200";
     return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  if (generations.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Generations</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Images className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Create your first photoshoot to get started</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">AI will place your product in realistic scenes</p>
        </div>
      </div>
    );
  }

  const hasRecoverable = generations.some(g => g.status?.includes("failed") && !g.recovered);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold text-foreground"
      >
        Generations
      </motion.h1>


      <div className="space-y-6">
        {(generations || []).map((gen, idx) => (
          <motion.div
            key={gen.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{gen.prompt || "Generated Photoshoot"}</p>
                <p className="text-sm text-muted-foreground capitalize">{gen.model || "AI Model"} · {format(new Date(gen.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(gen.status)}`}>
                  {gen.status === "completed" ? "Completed" : gen.status?.includes("failed") ? "Failed" : "Processing"}
                </span>

                {gen.status === "completed" && (
                   <>
                     <Button variant="outline" size="sm" onClick={() => handleSaveToAssets(gen.image_urls)}>
                       <FolderOpen className="h-3.5 w-3.5 mr-1" /> Save to Assets
                     </Button>
                     <Button variant="outline" size="sm" onClick={() => handleDownloadAll(gen.image_urls)}>
                       <Download className="h-3.5 w-3.5 mr-1" /> Download
                     </Button>
                   </>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {((gen.image_urls || gen.images) || []).map((img: string, i: number) => (
                <div key={i} className="relative group">
                  <motion.img
                    src={img}
                    alt=""
                    className="rounded-lg aspect-square object-cover border border-border w-full"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.2 }}
                  />
                  <div className="absolute bottom-2 left-2 right-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="bg-black/70 text-white text-[10px] px-2 py-1 rounded-md text-center backdrop-blur-sm truncate">
                      {i === 0 ? "Accurate Product Image" : i === 1 ? "Creative Marketing Version" : `Variation ${i+1}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
