import React from "react";
import { AlertCircle, RotateCcw, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message: string;
  description?: string;
  onRetry: () => void;
  retrying?: boolean;
}

export function ErrorState({
  message,
  description,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  const isOffline = !window.navigator.onLine;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center space-y-4"
    >
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
        {isOffline ? (
          <WifiOff className="h-8 w-8 text-destructive" />
        ) : (
          <AlertCircle className="h-8 w-8 text-destructive" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {isOffline ? "Connection issue detected" : message}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {isOffline
            ? "You are currently offline. Please check your internet connection and try again when online."
            : description || "Something went wrong while fetching the data. Please try again."}
        </p>
      </div>

      <Button
        onClick={onRetry}
        disabled={retrying}
        variant="outline"
        className={cn(
          "min-w-[120px] transition-all",
          retrying && "opacity-80"
        )}
      >
        {retrying ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </>
        )}
      </Button>
    </motion.div>
  );
}
