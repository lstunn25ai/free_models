/**
 * Tooltip — accessible hover/focus tooltip using native title + custom UI.
 *
 * For production use, this provides a lightweight tooltip that:
 *  - Shows on hover AND focus (keyboard accessible)
 *  - Positions above the trigger
 *  - Has a max-width and wraps text
 *  - Uses aria-describedby for screen readers
 *
 * Props:
 *  - content: string or ReactNode
 *  - delay: ms before showing (default 300)
 *  - side: "top" | "bottom"
 */

import {
  useState,
  useRef,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({
  content,
  children,
  delay = 300,
  side = "top",
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef(
    `tooltip-${Math.random().toString(36).slice(2, 9)}`,
  ).current;

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") hide();
  };

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      <span aria-describedby={visible ? tooltipId : undefined}>
        {children}
      </span>
      <AnimatePresence>
        {visible && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute z-50 left-1/2 -translate-x-1/2 pointer-events-none",
              "max-w-xs whitespace-normal text-center",
              "px-2.5 py-1.5 rounded-lg text-xs",
              "bg-ink-700/95 backdrop-blur-sm text-ink-100 border border-ink-600/30",
              "shadow-ambient",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            )}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
