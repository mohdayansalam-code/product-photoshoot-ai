import { Coins, AlertCircle, RotateCcw, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreditIndicatorProps {
  used: number;
  limit: number;
  collapsed: boolean;
  loading?: boolean;
  error?: boolean;
  retrying?: boolean;
  onRetry?: () => void;
}

export function CreditIndicator({ 
  used, 
  limit,
  collapsed,
  loading = false,
  error = false,
  retrying = false,
  onRetry
}: CreditIndicatorProps) {
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

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
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground font-medium">Free Plan</p>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{used} / {limit}</span>
            </div>
            <Progress value={percentage} className="h-1.5 mt-1.5" />
            {used >= limit && (
               <p className="text-[10px] text-destructive mt-2 font-medium leading-tight">
                 Limit reached. Upgrade for more.
               </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
