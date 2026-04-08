import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Trash2, Pencil, FolderOpen, Camera, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAssets, fetchProducts, getGenerations } from "@/lib/api";
import { GridSkeleton } from "@/components/ui/SkeletonViews";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const tabs = ["Products", "Generated", "Edited"] as const;

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Products");
  const [isLoading, setIsLoading] = useState(true);
  
  const [products, setProducts] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const loadData = async () => {
       try {
          if (activeTab === "Products" && products.length === 0) {
             const data = await fetchProducts();
             setProducts(data.map((p: any, i) => ({ id: p.id, src: p.imageUrl, name: p.name || `Product ${(i+1)}` })));
          }
          if (activeTab === "Generated" && generations.length === 0) {
             const data = await getGenerations();
             const list: any[] = [];
             data.forEach((g: any, i) => {
                 (g.images || g.image_urls || []).forEach((imgUrl: string, j: number) => {
                     list.push({ id: `g-${g.id}-${j}`, src: imgUrl, name: `Generated ${g.scene || i}` });
                 });
             });
             setGenerations(list);
          }
          if (activeTab === "Edited" && assets.length === 0) {
             const data = await fetchAssets();
             setAssets(data);
          }
       } catch(e: any) {
          console.error("Failed to load generic assets", e);
       }
       setIsLoading(false);
    };
    loadData();
  }, [activeTab]);

  const getActiveList = () => {
      if (activeTab === "Products") return products;
      if (activeTab === "Generated") return generations;
      return assets;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Assets Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage your product images and generated assets</p>
      </motion.div>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="assets-tab"
                className="absolute inset-0 bg-card rounded-md shadow-soft"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
           <div className="pt-4"><GridSkeleton count={4} /></div>
        ) : getActiveList().length === 0 ? (
           <motion.div
             key="empty"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex flex-col items-center justify-center py-20 bg-secondary/30 border border-dashed border-border rounded-xl mt-4"
           >
             <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
             <h3 className="text-xl font-medium text-foreground">
                {activeTab === "Products" ? "No products yet" : activeTab === "Edited" ? "No saved images" : "No generated images"}
             </h3>
             <p className="text-sm text-muted-foreground max-w-sm text-center mt-1">
                {activeTab === "Products" ? "Upload your first product to get started." : "Your saved files will appear here."}
             </p>
           </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4"
          >
            {getActiveList().map((asset, i) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="group rounded-xl border border-border bg-card overflow-hidden shadow-soft"
            >
              <div className="relative aspect-square overflow-hidden">
                <img src={asset.src} alt={asset.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm" title="Use in Photoshoot" asChild>
                    <Link to="/dashboard/generate">
                      <Camera className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm" title="Edit" asChild>
                    <Link to={`/dashboard/editor?image=${encodeURIComponent(asset.src)}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm" title="Download" onClick={() => {
                    const link = document.createElement('a');
                    link.href = asset.src;
                    link.download = asset.name;
                    link.click();
                    toast({ title: "Download started" });
                  }}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm text-destructive" title="Delete" onClick={() => {
                    toast({
                      title: "Action Disabled",
                      description: "Delete is currently disabled for mock assets.",
                      variant: "destructive"
                    });
                  }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs font-medium text-foreground p-2.5 truncate">{asset.name}</p>
            </motion.div>
          ))}
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
