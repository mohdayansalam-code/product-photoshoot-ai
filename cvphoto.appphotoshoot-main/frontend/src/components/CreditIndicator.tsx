import { Coins, AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreditIndicatorProps {
  credits: number;
  maxCredits: number;
  collapsed: boolean;
  loading?: boolean;
  error?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
}

export function CreditIndicator({ 
  credits, 
  maxCredits, 
  collapsed,
  loading = false,
  error = false,
  retrying = false,
  onRetry
}: CreditIndicatorProps) {
  const percentage = Math.round((credits / maxCredits) * 100);

  if (error && !collapsed) {
    return (
      <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">Sync Error</p>
            <Button 
              onClick={onRetry} 
              disabled={retrying}
              variant="link" 
              className="h-auto p-0 text-xs text-foreground/70 hover:text-foreground flex items-center gap-1"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  Retry Sync
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg bg-accent p-3 transition-opacity", (loading || retrying) && "opacity-60")}>
      <div className="flex items-center gap-2">
        <Coins className={cn("h-4 w-4 text-primary flex-shrink-0", (loading || retrying) && "animate-pulse")} />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Credits remaining</p>
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-foreground">{credits}</p>
              <span className="text-[10px] text-muted-foreground">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-1.3 mt-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}
