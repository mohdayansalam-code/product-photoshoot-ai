import { Camera, ArrowRight, Upload, Pencil, FolderOpen, Package, Layers } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fetchProducts, fetchAssets, fetchCredits, getGenerations } from "@/lib/api";
import { useEffect, useState, useRef } from "react";
import { ErrorState } from "@/components/ErrorState";
import { useProductStore } from "@/lib/productStore";
import { GridSkeleton } from "@/components/ui/SkeletonViews";
import { safeApi } from "@/utils/safeApi";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);
  const [retrying, setRetrying] = useState(false);
  const [errorFetch, setErrorFetch] = useState<string | null>(null);
  
  const [assetsCount, setAssetsCount] = useState(0);
  const [generationsCount, setGenerationsCount] = useState(0);
  const [creditsLeft, setCreditsLeft] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [slowLoad, setSlowLoad] = useState(false);
  const { products, setProducts } = useProductStore();

  const loadDashboard = async (signal?: AbortSignal) => {
    if (loading) return;
    
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    setErrorFetch(null);

    try {
      // Temporarily disabled due to backend misconfiguration throwing invalid JSON
      // const productsReq = await safeApi(() => fetchProducts(signal), []);
      // const assetsReq = await safeApi(() => fetchAssets(signal), []);
      const generationsReq = await safeApi(() => getGenerations(signal), []);

      if (isMountedRef.current) {
        // setProducts(productsReq || []);
        // setAssetsCount(assetsReq?.length || 0);
        setGenerationsCount(generationsReq?.length || 0);
      }
    } catch(e) {
      console.error("Dashboard primary API failed", e);
      if (isMountedRef.current) {
        setErrorFetch("Unable to load full dashboard.");
      }
    }

    let creditsReq = null;
    try {
      creditsReq = await safeApi(() => fetchCredits(signal), null);
    } catch (e) {
      console.error("Credits API failed", e);
    }

    if (isMountedRef.current) {
        console.log("CREDITS API FULL:", JSON.stringify(creditsReq));
        if (creditsReq) {
            setCreditsLeft(creditsReq.credits_remaining);
        }
        setLastUpdated(new Date());
        setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => {
      isMountedRef.current = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setSlowLoad(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const recentProducts = (Array.isArray(products) ? products : []).slice(0, 4);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Clean Dynamic Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
             <h1 className="text-3xl font-bold text-foreground">Overview</h1>
             {!loading && (
               <span className="text-xs text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full mt-1 sm:mt-0 font-medium">
                 Last updated: {format(lastUpdated, "h:mm a")}
               </span>
             )}
           </div>
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
            onRetry={() => loadDashboard()} 
            retrying={retrying}
          />
        </div>
      ) : loading ? (
        <div className="space-y-6">
           <GridSkeleton count={2} />
           <GridSkeleton count={4} />
           {slowLoad && (
             <p className="text-center text-sm text-muted-foreground animate-pulse mt-4">
               Still loading... network may be slow.
             </p>
           )}
        </div>
      ) : (
        <div className="space-y-8">
            
          {/* Top summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center justify-center p-5 bg-card border border-border rounded-xl shadow-sm text-center">
               <div className="p-3 bg-primary/10 rounded-lg text-primary mb-3">
                  <Package className="h-6 w-6" />
               </div>
               <h3 className="text-2xl font-bold text-foreground">{products.length}</h3>
               <p className="text-sm font-medium text-muted-foreground mt-1">Total Products</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-5 bg-card border border-border rounded-xl shadow-sm text-center">
               <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500 mb-3">
                  <Camera className="h-6 w-6" />
               </div>
               <h3 className="text-2xl font-bold text-foreground">{generationsCount}</h3>
               <p className="text-sm font-medium text-muted-foreground mt-1">Generated Images</p>
            </div>

            <div className="flex flex-col items-center justify-center p-5 bg-card border border-border rounded-xl shadow-sm text-center">
               <div className="p-3 bg-secondary rounded-lg text-foreground mb-3">
                  <Layers className="h-6 w-6 opacity-80" />
               </div>
               <h3 className="text-2xl font-bold text-foreground">{assetsCount}</h3>
               <p className="text-sm font-medium text-muted-foreground mt-1">Assets Saved</p>
            </div>
            
            <div className="flex flex-col items-center justify-center p-5 bg-card border border-border rounded-xl shadow-sm text-center">
               <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 mb-3">
                  <ArrowRight className="h-6 w-6 rotate-45" />
               </div>
               <h3 className="text-2xl font-bold text-foreground">{creditsLeft}</h3>
               <p className="text-sm font-medium text-muted-foreground mt-1">Credits Remaining</p>
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  to="/dashboard/products"
                  className="group flex flex-col items-center text-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                     <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-foreground block mb-1">Upload Product</span>
                    <span className="text-sm text-muted-foreground">Add your first product image</span>
                  </div>
                </Link>

                <Link
                  to="/dashboard/editor"
                  className="group flex flex-col items-center text-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                     <Pencil className="h-6 w-6 opacity-80" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-foreground block mb-1">Open Editor</span>
                    <span className="text-sm text-muted-foreground">Edit and crop images</span>
                  </div>
                </Link>

                <Link
                  to="/dashboard/assets"
                  className="group flex flex-col items-center text-center gap-4 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-soft"
                >
                  <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:scale-110 transition-transform">
                     <FolderOpen className="h-6 w-6 opacity-80" />
                  </div>
                  <div>
                    <span className="text-lg font-medium text-foreground block mb-1">View Assets</span>
                    <span className="text-sm text-muted-foreground">Manage generated photos</span>
                  </div>
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
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-secondary/20 border border-border mx-2">
                 <div className="max-w-md space-y-6">
                     <div className="bg-background rounded-full p-4 inline-block shadow-sm border border-border mb-2">
                         <Camera className="h-10 w-10 text-primary" />
                     </div>
                     <h3 className="text-2xl font-bold text-foreground">Welcome to PhotoAI</h3>
                     <p className="text-muted-foreground text-lg">Create studio-quality product photos in seconds.</p>
                     
                     <div className="flex flex-col gap-3 text-left bg-card p-6 rounded-xl border border-border my-6">
                         <div className="flex items-center gap-3"><span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">1</span> <span className="font-medium">Upload product</span></div>
                         <div className="flex items-center gap-3"><span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">2</span> <span className="font-medium">Describe photoshoot</span></div>
                         <div className="flex items-center gap-3"><span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span> <span className="font-medium">Generate images</span></div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-3 justify-center">
                         <Button onClick={() => navigate("/dashboard/products")} size="lg" variant="outline" className="h-12 px-8">
                            <Upload className="h-4 w-4 mr-2" /> Upload Product
                         </Button>
                         <Button onClick={() => navigate("/dashboard/generate")} size="lg" className="h-12 px-8 gradient-primary text-white shadow-md">
                            Generate Photoshoot
                         </Button>
                     </div>
                 </div>
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

          {/* Example Results Section */}
          {products.length === 0 && generationsCount === 0 && (
             <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pt-4">
               <h2 className="text-xl font-bold text-foreground mb-4">Example Results</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Using standard demo images logically mapped for SaaS representation */}
                  <div className="rounded-xl overflow-hidden shadow-sm aspect-square border border-border">
                     <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80" alt="Example 1" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-sm aspect-square border border-border">
                     <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" alt="Example 2" className="w-full h-full object-cover" />
                  </div>
                  <div className="rounded-xl overflow-hidden shadow-sm aspect-square border border-border">
                     <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" alt="Example 3" className="w-full h-full object-cover" />
                  </div>
               </div>
             </motion.div>
          )}

        </div>
      )}
    </div>
  );
}
