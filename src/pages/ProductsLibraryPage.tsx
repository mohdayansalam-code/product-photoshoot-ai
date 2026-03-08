import { useState, useRef } from "react";
import { Plus, Camera, Pencil, Trash2, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProductStore } from "@/lib/productStore";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProductsLibraryPage() {
  const { products, addProduct, removeProduct } = useProductStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setNewPreview(URL.createObjectURL(file));
  };

  const handleAdd = () => {
    if (!newName) return;
    addProduct({ name: newName, imageUrl: newPreview || "/placeholder.svg" });
    setNewName("");
    setNewPreview(null);
    setDialogOpen(false);
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
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {newPreview ? (
                <img
                  src={newPreview}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
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
              <Button onClick={handleAdd} disabled={!newName} className="gradient-primary text-primary-foreground">
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
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
