import { Camera, Coins, Images, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MOCK_GENERATIONS } from "@/lib/api";
import { format } from "date-fns";

const stats = [
  { label: "Credits Remaining", value: "180", icon: Coins, color: "text-primary" },
  { label: "Images Generated", value: "240", icon: Images, color: "text-primary" },
  { label: "Photoshoots", value: "32", icon: Camera, color: "text-primary" },
];

export default function Index() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your activity overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card shadow-soft p-5 flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
              <s.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <div className="rounded-xl border border-border bg-card shadow-soft p-6 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Start a new photoshoot</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Upload a product and generate studio-quality images in seconds</p>
        </div>
        <Button asChild className="gradient-primary text-primary-foreground">
          <Link to="/generate">
            Generate <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Generations</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/generations">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        <div className="space-y-5">
          {MOCK_GENERATIONS.map((gen) => (
            <div key={gen.id} className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4">
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
                  <img key={i} src={img} alt="" className="rounded-lg aspect-square object-cover border border-border" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
