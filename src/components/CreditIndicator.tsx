import { Coins } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CreditIndicatorProps {
  credits: number;
  maxCredits: number;
  collapsed: boolean;
}

export function CreditIndicator({ credits, maxCredits, collapsed }: CreditIndicatorProps) {
  const percentage = Math.round((credits / maxCredits) * 100);

  return (
    <div className="rounded-lg bg-accent p-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary flex-shrink-0" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Credits remaining</p>
            <p className="text-sm font-semibold text-foreground">{credits}</p>
            <Progress value={percentage} className="h-1.5 mt-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}
