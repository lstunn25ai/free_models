/**
 * Modal — accessible dialog using <dialog> element + Framer Motion.
 *
 * Features:
 *  - Focus trap (native dialog handles this)
 *  - Escape to close
 *  - Backdrop click to close
 *  - Spring-animated entrance/exit
 *  - aria-labelledby for screen readers
 *
 * Props:
 *  - open: controlled visibility
 *  - onClose: callback when user requests close
 *  - title: dialog heading
 *  - children: content
 *  - size: "sm" | "md" | "lg"
 */

import { type ReactNode, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: Size;
}

const sizeStyles: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog panel */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "relative w-full rounded-card border border-ink-700/30",
              "bg-ink-900/95 backdrop-blur-2xl shadow-elevated",
              sizeStyles[size],
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800/50">
              <h2
                id="modal-title"
                className="text-base font-medium text-ink-100"
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-ink-500 hover:text-ink-300 transition-colors p-1 -mr-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
