import React, { memo } from 'react';
import { Settings, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolBadgeProps {
  tool: string;
  className?: string;
}

const TOOL_CONFIG: Record<string, { label: string, icon: React.ElementType }> = {
  'product_fix': { label: 'Product Fix Applied', icon: Settings },
  'remove_bg': { label: 'Background Removed', icon: CheckCircle2 },
  'upscale': { label: 'Upscaled', icon: CheckCircle2 },
};

export const ToolBadge = memo(({ tool, className }: ToolBadgeProps) => {
  const config = TOOL_CONFIG[tool];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-sm text-xs font-medium text-foreground", className)}>
      <Icon className="h-3.5 w-3.5 text-primary" />
      {config.label}
    </div>
  );
});

ToolBadge.displayName = 'ToolBadge';
