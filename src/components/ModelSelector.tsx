import { MODELS } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  selected: string;
  onSelect: (model: string) => void;
  imageCount: number;
}

export function ModelSelector({ selected, onSelect, imageCount }: ModelSelectorProps) {
  const currentModel = MODELS.find((m) => m.id === selected);
  const cost = currentModel ? currentModel.credits_per_image * imageCount : 0;

  return (
    <div className="space-y-2">
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger className="bg-card">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center gap-2">
                <span>{model.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {model.badge}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {currentModel?.name} → <span className="font-medium text-primary">{cost} credits</span> / {imageCount} images
      </p>
    </div>
  );
}
