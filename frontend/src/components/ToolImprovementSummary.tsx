import React, { memo } from 'react';
import { Check, Sparkles } from 'lucide-react';

interface ToolImprovementSummaryProps {
  tool: string;
}

const IMPROVEMENT_MESSAGES: Record<string, string[]> = {
  'product_fix': [
    'Label clarity improved',
    'Packaging defects reduced',
    'Product surface cleaned',
    'Text enhanced'
  ]
};

export const ToolImprovementSummary = memo(({ tool }: ToolImprovementSummaryProps) => {
  const improvements = IMPROVEMENT_MESSAGES[tool];
  if (!improvements || improvements.length === 0) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2 mt-3">
      <div className="flex items-center gap-1.5 text-primary">
        <Sparkles className="h-4 w-4" />
        <h4 className="text-sm font-semibold">AI Improvements:</h4>
      </div>
      <ul className="space-y-1 mt-1">
        {improvements.map((imp, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-primary/70 shrink-0 mt-0.5" />
            <span>{imp}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

ToolImprovementSummary.displayName = 'ToolImprovementSummary';
