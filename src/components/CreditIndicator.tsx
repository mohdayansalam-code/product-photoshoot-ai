import { Coins } from "lucide-react";

interface CreditIndicatorProps {
  credits: number;
  collapsed: boolean;
}

export function CreditIndicator({ credits, collapsed }: CreditIndicatorProps) {
  return (
    <div className="rounded-lg bg-accent p-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-primary flex-shrink-0" />
        {!collapsed && (
          <div>
            <p className="text-xs text-muted-foreground">Credits remaining</p>
            <p className="text-sm font-semibold text-foreground">{credits}</p>
          </div>
        )}
      </div>
    </div>
  );
}
