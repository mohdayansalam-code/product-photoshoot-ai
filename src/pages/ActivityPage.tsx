import { Camera, Eraser, Coins, Download, ArrowUp, Image } from "lucide-react";
import { motion } from "framer-motion";

const ICON_MAP: Record<string, typeof Camera> = {
  generate: Camera,
  remove_bg: Eraser,
  credit: Coins,
  download: Download,
  upscale: ArrowUp,
  upload: Image,
};

import { useEffect, useState } from "react";
import { getGenerations } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    getGenerations().then(data => {
      setActivities(data.map(gen => ({
        id: gen.id,
        type: "generate",
        title: "Generated photoshoot",
        desc: `${gen.prompt || "Generated Photoshoot"} · ${gen.image_count || 4} images · ${gen.model || "Auto"}`,
        time: formatDistanceToNow(new Date(gen.created_at), { addSuffix: true }),
        credits: -(gen.credits_used || 0)
      })));
    }).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-semibold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground">Your recent actions and credit usage</p>
      </motion.div>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-1">
          {activities.length === 0 ? (
            <div className="pl-12 py-8 text-sm text-muted-foreground flex flex-col items-start space-y-2">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center border border-dashed border-border mb-2">
                <Eraser className="h-5 w-5 opacity-40" />
              </div>
              <p>No recent activity.</p>
              <p className="opacity-70 text-xs">Actions you take on the platform will securely be logged here.</p>
            </div>
          ) : (
            activities.map((activity, i) => {
              const Icon = ICON_MAP[activity.type] || Camera;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex items-start gap-4 pl-2 py-3 group"
                >
                  <div className="relative z-10 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                    {activity.credits !== 0 && (
                      <p className={`text-xs font-medium ${activity.credits > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {activity.credits > 0 ? "+" : ""}{activity.credits} cr
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
