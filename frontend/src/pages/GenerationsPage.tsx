import { motion } from "framer-motion";
import { getGenerations } from "@/lib/api";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Eye, Images, RefreshCw, FolderOpen, Loader2 } from "lucide-react";
import { retryGeneration, uploadAsset } from "@/lib/api";
import { toast } from "sonner";

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<any[]>([]);

  const [retrying, setRetrying] = useState<Record<string, boolean>>({});

  const fetchGens = () => {
    getGenerations().then(setGenerations).catch(console.error);
  };

  useEffect(() => {
    fetchGens();
  }, []);

  const handleRetry = async (id: string) => {
    setRetrying(prev => ({ ...prev, [id]: true }));
    try {
      await retryGeneration(id);
      toast.success("Retry started. Check back soon.");
      fetchGens();
    } catch (error: any) {
      toast.error("Retry failed. Try again.");
    } finally {
      setRetrying(prev => ({ ...prev, [id]: false }));
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
     if (status === "failed") return "bg-red-100 text-red-700 border-red-200";
     return "bg-yellow-100 text-yellow-700 border-yellow-200";
  };

  if (generations.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Generations</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Images className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No generations yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create your first photoshoot to see generated images here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold text-foreground"
      >
        Generations
      </motion.h1>
      <div className="space-y-6">
        {generations.map((gen, idx) => (
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
                  {gen.status === "completed" ? "Completed" : gen.status === "failed" ? "Failed" : "Processing"}
                </span>
                {gen.status === "failed" && (
                   <Button variant="outline" size="sm" onClick={() => handleRetry(gen.id)} disabled={retrying[gen.id]}>
                     {retrying[gen.id] ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} 
                     Retry
                   </Button>
                )}
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
              {(gen.image_urls || []).map((img: string, i: number) => (
                <motion.img
                  key={i}
                  src={img}
                  alt=""
                  className="rounded-lg aspect-square object-cover border border-border"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
