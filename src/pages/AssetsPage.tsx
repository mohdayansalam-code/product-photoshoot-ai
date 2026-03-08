import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Trash2, Pencil, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCENES } from "@/lib/api";

const tabs = ["Products", "Generated", "Edited"] as const;

const mockAssets = {
  Products: SCENES.map((s, i) => ({ id: `p${i}`, src: s.thumbnail, name: `Product ${i + 1}` })),
  Generated: SCENES.slice(0, 4).map((s, i) => ({ id: `g${i}`, src: s.thumbnail, name: `Generated ${i + 1}` })),
  Edited: SCENES.slice(0, 2).map((s, i) => ({ id: `e${i}`, src: s.thumbnail, name: `Edited ${i + 1}` })),
};

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Products");

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <FolderOpen className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Assets Library</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage your product images and generated assets</p>
      </motion.div>

      {/* Tabs */}
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

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          {mockAssets[activeTab].map((asset, i) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="group rounded-xl border border-border bg-card overflow-hidden shadow-soft"
            >
              <div className="relative aspect-square">
                <img src={asset.src} alt={asset.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-card/90 backdrop-blur-sm text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs font-medium text-foreground p-2.5 truncate">{asset.name}</p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
