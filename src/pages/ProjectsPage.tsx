import { FolderOpen, Image, Calendar, MoreHorizontal, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PROJECTS = [
  { id: 1, name: "Summer Collection", images: 24, scene: "Fashion Editorial", date: "Mar 6, 2026", status: "completed" },
  { id: 2, name: "Skincare Line Launch", images: 16, scene: "Luxury Skincare", date: "Mar 5, 2026", status: "completed" },
  { id: 3, name: "Jewelry Lookbook", images: 32, scene: "Jewelry Macro", date: "Mar 4, 2026", status: "in_progress" },
  { id: 4, name: "Electronics Promo", images: 8, scene: "White Background", date: "Mar 3, 2026", status: "completed" },
  { id: 5, name: "Home Decor Spring", images: 12, scene: "Influencer Lifestyle", date: "Mar 2, 2026", status: "draft" },
  { id: 6, name: "Sneaker Drop", images: 20, scene: "Fashion Editorial", date: "Mar 1, 2026", status: "completed" },
];

const statusColors: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  in_progress: "bg-primary/10 text-primary",
  draft: "bg-secondary text-muted-foreground",
};

export default function ProjectsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Manage your photoshoot projects</p>
        </div>
        <Button className="gradient-primary text-primary-foreground font-medium text-sm gap-2">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROJECTS.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
            className="rounded-xl border border-border bg-card p-4 space-y-3 cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.scene}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[0, 1, 2].map((j) => (
                <div key={j} className="aspect-square rounded-lg bg-secondary overflow-hidden">
                  <img src="/placeholder.svg" alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Image className="h-3 w-3" /> {project.images}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {project.date}</span>
              </div>
              <Badge variant="secondary" className={`text-[10px] ${statusColors[project.status]}`}>
                {project.status.replace("_", " ")}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
