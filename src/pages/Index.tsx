import { Camera, Coins, Images, ArrowRight, HardDrive } from "lucide-react";
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

      {/* Quick action */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border border-border bg-card shadow-soft p-6 flex items-center justify-between"
      >
        <div>
          <h2 className="font-semibold text-foreground">Start a new photoshoot</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload a product and generate studio-quality images in seconds</p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground">
          <Link to="/generate">
            Generate <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
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
    </div>
  );
}
