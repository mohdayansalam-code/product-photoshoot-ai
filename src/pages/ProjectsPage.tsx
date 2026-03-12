import { FolderOpen, Image, Calendar, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { getGenerations } from "@/lib/api";

export default function ProjectsPage() {
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGenerations().then(data => {
      setGenerations(data);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

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

      {loading ? (
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
          {generations.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
              className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer transition-colors flex flex-col justify-between"
              onClick={() => window.location.href = `/dashboard/generate`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 max-w-[80%]">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-secondary flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-sm text-foreground truncate">{project.prompt || "Generated Photoshoot"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.model === "seedream-5-lite" ? "Seedream 5 Lite" :
                       project.model === "seedream-4.5" ? "Seedream 4.5" :
                       project.model === "gemini-3.1" ? "Gemini 3.1" :
                       project.model === "flux-2-pro" ? "Flux 2 Pro" :
                       project.model}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 h-24">
                {(project.image_urls || []).slice(0, 3).map((url: string, j: number) => (
                  <div key={j} className="aspect-square rounded-lg bg-secondary overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Image className="h-3 w-3" /> {(project.image_urls || []).length}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
