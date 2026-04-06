import { Camera, ArrowRight, Upload, Pencil, FolderOpen, Package, Layers } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fetchProducts, fetchAssets } from "@/lib/api";
import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { useProductStore } from "@/lib/productStore";
import { GridSkeleton } from "@/components/ui/SkeletonViews";

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);
  
  const [assetsCount, setAssetsCount] = useState(0);
  const { products, setProducts } = useProductStore();

  const loadDashboard = async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    
    setErrorFetch(null);

    try {
      // Parallel loading of exact user-owned datasets
      const [fetchedProducts, fetchedAssets] = await Promise.all([
         fetchProducts(),
         fetchAssets()
      ]);
      
      setProducts(fetchedProducts);
      setAssetsCount(fetchedAssets.length);

    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err);
      setErrorFetch("Unable to load dashboard");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [setProducts]);

  const recentProducts = (Array.isArray(products) ? products : []).slice(0, 4);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Clean Dynamic Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
           <h1 className="text-3xl font-bold text-foreground">Overview</h1>
           {loading && !retrying ? (
              <div className="h-4 w-48 bg-secondary rounded animate-pulse mt-1" />
           ) : (
              <p className="text-muted-foreground mt-1 text-lg">
                Welcome! You have <span className="font-medium text-foreground">{products.length} products</span> ready for editing.
              </p>
           )}
        </div>
      </motion.div>

      {errorFetch ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8">
          <ErrorState 
            message={errorFetch} 
            onRetry={() => loadDashboard(true)} 
            retrying={retrying}
          />
        </div>
      ) : loading ? (
        <div className="space-y-6">
           <GridSkeleton count={2} />
           <GridSkeleton count={4} />
        </div>
      ) : (
        <div className="space-y-8">
            
          {/* Top summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center p-5 bg-card border border-border rounded-xl shadow-sm">
                <div className="p-3 bg-primary/10 rounded-lg mr-4 text-primary">
                    <Package className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Products</p>
                   <h3 className="text-2xl font-bold text-foreground">{products.length}</h3>
                </div>
            </div>
            <div className="flex items-center p-5 bg-card border border-border rounded-xl shadow-sm">
                <div className="p-3 bg-secondary rounded-lg mr-4 text-foreground text-opacity-80">
                    <Layers className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-sm font-medium text-muted-foreground">Assets Saved</p>
                   <h3 className="text-2xl font-bold text-foreground">{assetsCount}</h3>
                </div>
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/dashboard/products"
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                     <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Upload Product</span>
                </Link>

                <Link
                  to="/dashboard/editor"
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                     <Pencil className="h-5 w-5 opacity-80" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Open Editor</span>
                </Link>

                <Link
                  to="/dashboard/assets"
                  className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                     <FolderOpen className="h-5 w-5 opacity-80" />
                  </div>
                  <span className="text-sm font-medium text-foreground">View Assets</span>
                </Link>
            </div>
          </motion.div>

          {/* Recent Products */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card shadow-soft p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">Your Products</h2>
              {products.length > 0 && (
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
                  <Link to="/dashboard/products">View Library <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              )}
            </div>
            
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl bg-secondary/30 border border-dashed border-border mx-2">
                 <Package className="h-10 w-10 text-muted-foreground/60 mb-3" />
                 <h3 className="text-lg font-medium text-foreground">No products yet</h3>
                 <p className="text-sm text-muted-foreground mt-1 mb-5">Upload your first product to begin creating variations.</p>
                 <Button onClick={() => navigate("/dashboard/products")} className="gradient-primary">
                    <Upload className="h-4 w-4 mr-2" /> Upload Product
                 </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recentProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ y: -4 }}
                    className="group relative rounded-xl overflow-hidden border border-border bg-background shadow-sm"
                  >
                    <div className="relative aspect-square">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                             (e.target as HTMLImageElement).outerHTML = '<div class="absolute inset-0 flex items-center justify-center bg-secondary text-xs text-muted-foreground">Missing</div>';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                          <Button size="sm" className="bg-white text-black hover:bg-neutral-200 shadow-md" asChild>
                            <Link to={`/dashboard/editor?image=${encodeURIComponent(product.imageUrl)}`}>
                              <Pencil className="h-3 w-3 mr-2" /> Edit locally
                            </Link>
                          </Button>
                        </div>
                    </div>
                    <div className="p-3 border-t border-border">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{format(new Date(product.addedAt), "MMM d, yyyy")}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      )}
    </div>
  );
}
