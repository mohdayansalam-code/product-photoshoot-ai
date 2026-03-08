import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface MotionCardProps extends HTMLMotionProps<"div"> {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, children, delay = 0, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -2, boxShadow: "0 8px 30px -8px hsl(220 20% 10% / 0.12)" }}
      className={cn("rounded-xl border border-border bg-card shadow-soft transition-colors", className)}
      {...props}
    >
      {children}
    </motion.div>
  )
);

MotionCard.displayName = "MotionCard";
