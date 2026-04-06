import React, { useState, useRef, useEffect, memo } from 'react';
import { ArrowRight } from 'lucide-react';

interface BeforeAfterCompareProps {
  originalImage: string;
  resultImage: string;
}

export const BeforeAfterCompare = memo(({ originalImage, resultImage }: BeforeAfterCompareProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(5, Math.min((x / rect.width) * 100, 95));
    setSliderPosition(percent);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  };

  const handleInteractionEnd = () => {
    setIsDragging(false);
  };

   
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleInteractionEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleInteractionEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleInteractionEnd);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-border shadow-soft touch-none select-none bg-secondary/20 aspect-video group"
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        handleMove(e.touches[0].clientX);
      }}
    >
      {/* Background (After) */}
      <img 
        src={resultImage} 
        alt="After result"
        className="absolute inset-0 w-full h-full object-contain bg-black/5"
        draggable={false}
      />
      
      {/* Foreground (Before) clipped */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={originalImage} 
          alt="Before original"
          className="absolute top-0 left-0 w-full h-full object-contain bg-black/5"
          style={{ width: `${100 / (sliderPosition / 100)}%`, maxWidth: 'none', minWidth: '100vw', transform: 'translateX(0)' }} // Note: We use absolute full width containment to prevent shifting. Real image scales by max width container mapping.
          ref={(img) => {
            if (img && containerRef.current) {
               img.style.width = `${containerRef.current.getBoundingClientRect().width}px`;
            }
          }}
          draggable={false}
        />
      </div>

      {/* Slider Line & Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 transition-transform hover:scale-x-150"
        style={{ left: `calc(${sliderPosition}% - 2px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-border group-hover:scale-110 transition-transform">
           <ArrowRight className="h-4 w-4 text-primary rotate-180" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 z-20">
        <span className="bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-foreground shadow-sm border border-border/50">Before</span>
      </div>
      <div className="absolute top-4 right-4 z-20">
        <span className="bg-primary px-3 py-1.5 rounded-full text-xs font-semibold text-primary-foreground shadow-sm">After</span>
      </div>
    </div>
  );
});

BeforeAfterCompare.displayName = 'BeforeAfterCompare';
