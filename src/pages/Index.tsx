import { Camera, Coins, Images, ArrowRight, HardDrive, Upload, Pencil, Wand2, Download, Maximize, Eraser } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { MOCK_GENERATIONS } from "@/lib/api";
import { format } from "date-fns";

const stats = [
  { label: "Credits Remaining", value: "180", icon: Coins },
  { label: "Images Generated", value: "240", icon: Images },
  { label: "Active Projects", value: "12", icon: Camera },
  { label: "Storage Used", value: "2.4 GB", icon: HardDrive },
];

const quickActions = [
  { label: "Create Photoshoot", icon: Camera, to: "/generate", gradient: true },
  { label: "Upload Product", icon: Upload, to: "/generate" },
  { label: "Open Image Editor", icon: Pencil, to: "/editor" },
  { label: "AI Tools", icon: Wand2, to: "/ai-tools" },
];

export default function Index() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your activity overview</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <StatsCard key={s.label} label={s.label} value={s.value} icon={s.icon} delay={i * 0.08} />
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {quickActions.map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 + i * 0.06 }}
            whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
          >
            <Link
              to={action.to}
              className={`flex flex-col items-center gap-3 rounded-xl border border-border p-5 transition-colors ${
                action.gradient
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-foreground hover:border-primary/30"
              }`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Generations</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/generations">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        <div className="space-y-5">
          {MOCK_GENERATIONS.map((gen, idx) => (
            <motion.div
              key={gen.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4 cursor-default"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{gen.scene}</p>
                  <p className="text-sm text-muted-foreground">{gen.model} · {format(new Date(gen.created_at), "MMM d, yyyy h:mm a")}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                  {gen.status}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {gen.images.map((img, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden border border-border">
                    <motion.img
                      src={img}
                      alt=""
                      className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      {[
                        { icon: Download, label: "Download" },
                        { icon: Pencil, label: "Edit" },
                        { icon: Maximize, label: "Upscale" },
                        { icon: Eraser, label: "Remove BG" },
                      ].map(({ icon: Icon, label }) => (
                        <Button key={label} size="icon" variant="secondary" className="h-7 w-7 bg-card/90 backdrop-blur-sm" title={label}>
                          <Icon className="h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
