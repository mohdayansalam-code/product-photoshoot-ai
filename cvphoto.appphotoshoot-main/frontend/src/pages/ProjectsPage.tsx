import { FolderOpen, Image, Calendar, Plus, Coins, Timer, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { getGenerations, retryGeneration } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/ErrorState";

const statusColor: Record<string, string> = {
  queued: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  generating: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  enhancing: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20"
};

export default function ProjectsPage() {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);
  const [isRetryingFetch, setIsRetryingFetch] = useState(false);

  const { toast } = useToast();
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const fetchProjectsData = async (isRetry = false) => {
    if (isRetry) setIsRetryingFetch(true);
    else setLoading(true);
    
    setErrorFetch(null);

    try {
      const data = await getGenerations();
      setGenerations(data);
      if (isRetry) {
        toast({
          title: "Generations refreshed",
          description: "History loaded successfully.",
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorFetch("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setIsRetryingFetch(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, []);

  const handleRetry = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setRetryingIds(prev => new Set(prev).add(id));
      await retryGeneration(id);
      toast({ title: "Generation Retrying", description: "Successfully placed back into the queue." });
      await fetchProjectsData();
    } catch (err: any) {
      toast({ title: "Retry Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your past projects and assets</p>
        </div>
        <Button onClick={() => window.location.href = '/dashboard/generate'} className="gradient-primary text-primary-foreground font-medium text-sm gap-2">
          <Plus className="h-4 w-4" /> New Photoshoot
        </Button>
      </motion.div>

      {errorFetch ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-12 mt-8">
          <ErrorState 
            message="Failed to load generations" 
            onRetry={() => fetchProjectsData(true)} 
            retrying={isRetryingFetch}
          />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64 rounded-xl w-full" />
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <FolderOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No generations yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create your first AI photoshoot to see it here.</p>
          <Button onClick={() => window.location.href = '/dashboard/generate'} variant="outline" className="mt-4">Generate Photos</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {generations.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
                className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 max-w-[70%]">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-secondary flex items-center justify-center">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="truncate focus:outline-none">
                      <p className="font-medium text-sm text-foreground truncate">{project.prompt || "Generated Photoshoot"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.model === "seedream-5-lite" ? "Seedream 5 Lite" :
                         project.model === "seedream-4.5" ? "Seedream 4.5" :
                         project.model === "gemini-3.1" ? "Gemini 3.1" :
                         project.model === "flux-2-pro" ? "Flux 2 Pro" :
                         project.model || "Auto"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <Badge variant="outline" className={`capitalize font-medium text-[10px] ${statusColor[project.status || "processing"] || statusColor.processing}`}>
                    {project.status === "processing" ? <Timer className="w-3 h-3 mr-1 animate-pulse" /> : null}
                    {project.status || "Processing"}
                  </Badge>
                </div>

                {/* Imagery Preview */}
                <div className="grid grid-cols-3 gap-1.5 h-24 mt-2">
                  {project.status === "failed" ? (
                    <div className="col-span-3 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5">
                      <p className="text-xs text-red-500/80">Generation Failed</p>
                    </div>
                  ) : (project.image_urls || []).length > 0 ? (
                    (project.image_urls || []).slice(0, 3).map((url: string, j: number) => (
                      <div key={j} className="aspect-square rounded-lg bg-secondary overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 flex items-center justify-center rounded-lg bg-secondary/30 border border-dashed border-border">
                      <p className="text-xs text-muted-foreground animate-pulse">Generating imagery...</p>
                    </div>
                  )}
                </div>

                {/* Footer Metrics & Actions */}
                <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5" title="Images Generated">
                      <Image className="h-3.5 w-3.5" /> {(project.image_urls || []).length} / {project.image_count || 0}
                    </span>
                    <span className="flex items-center gap-1.5" title="Credits Consumed">
                      <Coins className="h-3.5 w-3.5" /> {project.credits_used || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {new Date(project.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="default" 
                      className="flex-1 text-xs h-8 bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      onClick={() => {
                        localStorage.setItem("photoai-reuse-prompt", project.prompt);
                        window.location.href = "/dashboard/generate";
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Generate Again
                    </Button>
                    
                    {project.status === "failed" && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 px-3"
                        disabled={retryingIds.has(project.id)}
                        onClick={(e) => handleRetry(e, project.id)}
                      >
                        {retryingIds.has(project.id) ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          "Retry"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
