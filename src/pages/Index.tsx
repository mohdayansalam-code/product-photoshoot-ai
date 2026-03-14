import { Camera, Coins, Images, ArrowRight, HardDrive, Upload, Pencil, Wand2, Download, Maximize, Eraser, FolderOpen, AlertTriangle, Sparkles, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/StatsCard";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDashboardStats, getGenerations, DashboardStats, fetchProducts } from "@/lib/api";
import { useEffect, useState } from "react";


const secondaryActions = [
  { label: "Upload Product", icon: Upload, to: "/dashboard/generate" },
  { label: "Open Image Editor", icon: Pencil, to: "/dashboard/editor" },
  { label: "AI Tools", icon: Wand2, to: "/dashboard/tools" },
];


import { useProductStore } from "@/lib/productStore";

export default function Index() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<any[]>([]);
  const { products, setProducts } = useProductStore();

  useEffect(() => {
    getDashboardStats().then(setDashboardStats).catch(console.error);
    getGenerations().then(data => setRecentGenerations(data.slice(0, 4))).catch(console.error);
    fetchProducts().then(setProducts).catch(console.error);
  }, [setProducts]);

  const lowCredits = (dashboardStats?.credits || 0) < 20;
  const recentProducts = products.slice(0, 4);

  const stats = [
    { label: "Credits Remaining", value: String(dashboardStats?.credits || 0), icon: Coins },
    { label: "Images Generated", value: String(dashboardStats?.images_generated || 0), icon: Images },
    { label: "Active Projects", value: String(dashboardStats?.active_projects || 0), icon: Camera },
    { label: "Storage Used", value: dashboardStats?.storage_used || "0 MB", icon: HardDrive },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your activity overview</p>
      </motion.div>

      {/* Credit Warning */}
      {lowCredits && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert className="border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm text-foreground">Running low on credits. Upgrade to continue generating images.</span>
              <Button size="sm" variant="destructive" asChild>
                <Link to="/dashboard/credits">Upgrade Plan</Link>
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <StatsCard key={s.label} label={s.label} value={s.value} icon={s.icon} delay={i * 0.08} />
        ))}
      </div>

      {/* Quick Actions — Primary CTA + Secondary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
        <motion.div
          whileHover={{ y: -4, boxShadow: "0 12px 40px -8px hsl(217 91% 60% / 0.3)" }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Link
            to="/dashboard/generate"
            className="flex items-center gap-4 rounded-xl p-6 gradient-primary text-primary-foreground shadow-lg transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold">Create Photoshoot</p>
              <p className="text-sm opacity-80">Generate stunning AI product photos in seconds</p>
            </div>
            <ArrowRight className="h-5 w-5 opacity-70" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-3 gap-4">
          {secondaryActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 + i * 0.06 }}
              whileHover={{ y: -3, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
            >
              <Link
                to={action.to}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <action.icon className="h-6 w-6 text-foreground" />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Products */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border border-border bg-card shadow-soft p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Products</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/products">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        {recentProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No products yet. Upload your first product.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -2 }}
                className="group relative rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button size="sm" className="gradient-primary text-primary-foreground text-xs" asChild>
                    <Link to="/dashboard/generate">
                      <Camera className="h-3 w-3 mr-1" /> Generate Photoshoot
                    </Link>
                  </Button>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(product.addedAt), "MMM d")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Recent Generations</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard/generations">View all <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        <div className="space-y-5">
          {recentGenerations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">No generations yet. Create your first photoshoot.</p>
          ) : (
            recentGenerations.map((gen, idx) => (
              <motion.div
                key={gen.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                whileHover={{ y: -2 }}
                className="group/card rounded-xl border border-border bg-card shadow-soft p-5 space-y-4 cursor-pointer hover:border-primary/20 transition-colors"
                onClick={() => window.location.href = "/dashboard/projects"}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{gen.prompt || "Generated Photoshoot"}</p>
                    <p className="text-sm text-muted-foreground capitalize">{gen.model || "AI Model"} · {format(new Date(gen.created_at), "MMM d, yyyy h:mm a")}</p>
                  </div>
                <div className="flex items-center gap-2">
                  <div className="hidden group-hover/card:flex items-center gap-1.5 transition-all">
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <Link to="/dashboard/projects"><FolderOpen className="h-3 w-3 mr-1" /> Open Project</Link>
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <Link to="/dashboard/editor"><Pencil className="h-3 w-3 mr-1" /> Edit</Link>
                    </Button>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                    {gen.status}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 h-32">
                {gen.status === "failed" ? (
                  <div className="col-span-4 flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5">
                    <p className="text-xs text-red-500/80">Generation Failed</p>
                  </div>
                ) : (gen.image_urls || []).length > 0 ? (
                  (gen.image_urls || []).slice(0, 4).map((img: string, i: number) => (
                    <div key={i} className="group relative rounded-lg overflow-hidden bg-secondary">
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
                ))
               ) : (
                  <div className="col-span-4 flex items-center justify-center rounded-lg bg-secondary/30 border border-dashed border-border">
                    <p className="text-xs text-muted-foreground animate-pulse">Generating imagery...</p>
                  </div>
               )}
              </div>
            </motion.div>
          )))}
        </div>
      </div>
    </div>
  );
}
