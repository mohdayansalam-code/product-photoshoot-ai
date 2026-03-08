import { Switch } from "@/components/ui/switch";

export const ENHANCEMENTS = [
  { id: "remove_bg", label: "Remove Background", credits: 2 },
  { id: "white_bg", label: "White Background", credits: 1 },
  { id: "super_res", label: "Super Resolution", credits: 3 },
  { id: "upscale_v4", label: "Upscale v4", credits: 4 },
  { id: "lock_style", label: "Lock Style", credits: 2, description: "Consistent lighting, environment & composition for campaign-style shoots" },
];

interface EnhancementsToggleGroupProps {
  active: string[];
  onToggle: (id: string) => void;
}

export function EnhancementsToggleGroup({ active, onToggle }: EnhancementsToggleGroupProps) {
  return (
    <div className="space-y-3">
      {ENHANCEMENTS.map((e) => (
        <div key={e.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{e.label}</p>
            {e.description && <p className="text-xs text-muted-foreground/70 max-w-[220px]">{e.description}</p>}
            <p className="text-xs text-muted-foreground">+{e.credits} credits</p>
          </div>
          <Switch
            checked={active.includes(e.id)}
            onCheckedChange={() => onToggle(e.id)}
          />
        </div>
      ))}
    </div>
  );
}
