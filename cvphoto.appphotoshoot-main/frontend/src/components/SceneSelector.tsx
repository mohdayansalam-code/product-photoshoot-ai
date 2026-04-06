import { motion } from "framer-motion";
import { SCENES, type Scene } from "@/lib/api";
import { Check } from "lucide-react";

interface SceneSelectorProps {
  selected: Scene | null;
  onSelect: (scene: Scene) => void;
}

export function SceneSelector({ selected, onSelect }: SceneSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {SCENES.map((scene) => (
        <motion.button
          key={scene.id}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(scene)}
          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
            selected?.id === scene.id
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/40"
          }`}
        >
          <img src={scene.thumbnail} alt={scene.name} className="w-full h-20 object-cover" />
          {selected?.id === scene.id && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-primary/20 flex items-center justify-center"
            >
              <div className="h-5 w-5 rounded-full gradient-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            </motion.div>
          )}
          <p className="text-[10px] font-medium text-foreground p-1 truncate">{scene.name}</p>
        </motion.button>
      ))}
    </div>
  );
}
