import { motion } from "framer-motion";
import { MOCK_GENERATIONS } from "@/lib/api";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";

export default function GenerationsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-semibold text-foreground"
      >
        Generations
      </motion.h1>
      <div className="space-y-6">
        {MOCK_GENERATIONS.map((gen, idx) => (
          <motion.div
            key={gen.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -2 }}
            className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{gen.scene}</p>
                <p className="text-sm text-muted-foreground">{gen.model} · {format(new Date(gen.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                  {gen.status}
                </span>
                <Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
              </div>
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
  );
}
