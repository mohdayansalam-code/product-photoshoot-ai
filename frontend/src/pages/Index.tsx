import { Camera, FolderOpen, Images, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getGenerations } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesUsed, setImagesUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(10);

  const getUsageUrl = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
         .from("profiles")
         .select("images_used, monthly_limit")
         .eq("id", session.user.id)
         .single();

      if (data) {
         setImagesUsed(data.images_used || 0);
         setMonthlyLimit(data.monthly_limit || 10);
      }
    } catch {
      console.log("usage error");
    }
  };

  useEffect(() => {
    getUsageUrl();
    const fetchGens = async () => {
      try {
        const gens = await getGenerations();
        setGenerations(gens || []);
      } catch (err) {
        console.error("Failed to load generations for dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGens();
  }, []);

  const recentGenerations = generations.slice(0, 4);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      {/* Clean Dynamic Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
        <div className="space-y-1">
           <div className="flex items-center gap-4">
             <h1 className="text-4xl font-bold tracking-tight text-foreground">Create Photoshoot</h1>
             <p className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm border border-green-200">{imagesUsed} / {monthlyLimit} images used</p>
           </div>
           <p className="text-lg text-muted-foreground">Generate stunning AI product photos in seconds.</p>
        </div>
        <Button 
          onClick={() => navigate("/dashboard/create-photoshoot")} 
          size="lg" 
          className="h-14 px-8 text-lg rounded-2xl shadow-lg gradient-primary hidden md:inline-flex"
        >
           <Plus className="w-5 h-5 mr-2" /> Create Photoshoot
        </Button>
      </motion.div>

      {/* Mobile CTA */}
      <Button 
        onClick={() => navigate("/dashboard/create-photoshoot")} 
        size="lg" 
        className="w-full h-14 text-lg rounded-2xl shadow-lg gradient-primary md:hidden"
      >
         <Plus className="w-5 h-5 mr-2" /> Create Photoshoot
      </Button>

      {/* Recent Generations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Images className="w-5 h-5 text-primary" /> Recent Generations
          </h2>
          {generations.length > 4 && (
            <Button variant="ghost" asChild>
              <Link to="/dashboard/generations">View all</Link>
            </Button>
          )}
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(idx => (
               <div key={idx} className="aspect-square rounded-2xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : recentGenerations.length === 0 ? (
          <div className="border border-border/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-card/30">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
               <Camera className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No generations yet</h3>
            <p className="text-muted-foreground max-w-sm">Start your first AI photoshoot to see your generated images appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {recentGenerations.map((gen, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                key={gen.id} 
                className="group relative aspect-square rounded-2xl border border-border overflow-hidden bg-card/50 shadow-sm hover:shadow-md transition-all"
              >
                <img 
                  src={gen.image_urls?.[0] || gen.images?.[0] || "https://via.placeholder.com/400?text=Processing..."} 
                  alt={gen.prompt} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-xs font-medium truncate">{gen.prompt || "Photoshoot"}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{format(new Date(gen.created_at), "MMM d, yyyy")}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Links / Saved Assets */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pt-8 space-y-6"
      >
        <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" /> Library
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link to="/dashboard/assets" className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-colors flex items-center gap-4 group">
               <div className="p-4 bg-primary/10 rounded-xl group-hover:scale-105 transition-transform text-primary">
                 <FolderOpen className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="font-semibold text-lg">Saved Assets</h3>
                  <p className="text-sm text-muted-foreground">Manage your saved product images</p>
               </div>
            </Link>
            
            <Link to="/dashboard/generations" className="p-6 rounded-2xl border border-border bg-card/50 hover:bg-card transition-colors flex items-center gap-4 group">
               <div className="p-4 bg-secondary rounded-xl group-hover:scale-105 transition-transform">
                 <Images className="w-6 h-6 text-foreground" />
               </div>
               <div>
                  <h3 className="font-semibold text-lg">Generation History</h3>
                  <p className="text-sm text-muted-foreground">View all past generations</p>
               </div>
            </Link>
        </div>
      </motion.div>
    </div>
  );
}
