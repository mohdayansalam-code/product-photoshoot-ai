import { useState, useRef, useEffect } from "react";
import { Plus, Camera, Pencil, Trash2, Package, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductStore } from "@/lib/productStore";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { fetchProducts, uploadProduct } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProductsLibraryPage() {
  const { products, setProducts, addProduct, removeProduct } = useProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [setProducts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewPreview(URL.createObjectURL(file));
      if (!newName) {
        setNewName(file.name.split('.')[0]); // Default name to filename
      }
    }
  };

  const handleAdd = async () => {
    if (!newName || !selectedFile) return;

    setIsUploading(true);
    try {
      const { product_id, image_url } = await uploadProduct(selectedFile, newName);
      addProduct({
        id: product_id,
        name: newName,
        imageUrl: image_url,
        addedAt: new Date().toISOString()
      });
      setNewName("");
      setNewPreview(null);
      setSelectedFile(null);
      setDialogOpen(false);
    } catch (err) {
      console.error("Upload failed", err);
      // Optional: Show toast error here
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Product Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store product images to reuse across multiple photoshoots
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Upload Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input
                placeholder="Product name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={isUploading}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              {newPreview ? (
                <div className="relative group">
                  <img
                    src={newPreview}
                    alt=""
                    className={`w-full aspect-square object-cover rounded-lg border border-border ${isUploading ? 'opacity-50' : ''}`}
                  />
                  {!isUploading && (
                    <button
                      onClick={() => {
                        setNewPreview(null);
                        setSelectedFile(null);
                        setNewName("");
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors"
                >
                  <Package className="h-8 w-8" />
                  <span className="text-sm">Click to upload image</span>
                </button>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!newName || !selectedFile || isUploading} className="gradient-primary text-primary-foreground">
                {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No products yet. Upload your first product to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          <AnimatePresence>
            {products.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="group rounded-xl border border-border bg-card shadow-soft overflow-hidden"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/50 transition-all duration-300 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button size="sm" className="gradient-primary text-primary-foreground text-xs" asChild>
                      <Link to="/generate">
                        <Camera className="h-3 w-3 mr-1" /> Generate
                      </Link>
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-card/90 backdrop-blur-sm"
                      title="Delete"
                      onClick={() => removeProduct(product.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(product.addedAt), "MMM d, yyyy")}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
