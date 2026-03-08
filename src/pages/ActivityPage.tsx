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

const ACTIVITIES = [
  { id: 1, type: "generate", title: "Generated photoshoot", desc: "Summer Collection · 4 images · Seedream 4.5", time: "2 min ago", credits: -10 },
  { id: 2, type: "remove_bg", title: "Removed background", desc: "product_sneaker.png", time: "15 min ago", credits: -1 },
  { id: 3, type: "upscale", title: "Upscaled image", desc: "skincare_hero.png · 4x", time: "1 hour ago", credits: -4 },
  { id: 4, type: "download", title: "Downloaded images", desc: "Jewelry Lookbook · 8 images", time: "2 hours ago", credits: 0 },
  { id: 5, type: "generate", title: "Generated photoshoot", desc: "Electronics Promo · 2 images · Flux 2 Pro", time: "3 hours ago", credits: -6 },
  { id: 6, type: "credit", title: "Credits purchased", desc: "Pro Plan · 500 credits", time: "1 day ago", credits: 500 },
  { id: 7, type: "upload", title: "Uploaded product image", desc: "home_decor_vase.png", time: "1 day ago", credits: 0 },
  { id: 8, type: "generate", title: "Generated photoshoot", desc: "Home Decor Spring · 4 images · Gemini 3.1", time: "2 days ago", credits: -8 },
];

export default function ActivityPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-semibold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground">Your recent actions and credit usage</p>
      </motion.div>

      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-1">
          {ACTIVITIES.map((activity, i) => {
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
          })}
        </div>
      </div>
    </div>
  );
}
