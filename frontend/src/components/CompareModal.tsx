import React, { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BeforeAfterCompare } from './BeforeAfterCompare';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: string;
  resultImage: string;
  toolLabel?: string;
}

export const CompareModal = memo(({ isOpen, onClose, originalImage, resultImage, toolLabel = "Result" }: CompareModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="mb-2 shrink-0">
          <DialogTitle className="text-xl font-semibold">Compare {toolLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full relative min-h-[50vh] flex items-center justify-center bg-secondary/10 rounded-xl overflow-hidden shadow-inner">
          <BeforeAfterCompare originalImage={originalImage} resultImage={resultImage} />
        </div>
      </DialogContent>
    </Dialog>
  );
});

CompareModal.displayName = 'CompareModal';
