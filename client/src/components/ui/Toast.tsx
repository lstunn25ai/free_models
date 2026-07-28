/**
 * Toast — accessible toast notification system.
 *
 * Uses a simple context provider + AnimatePresence for enter/exit.
 * Toasts auto-dismiss after 4s. Screen readers announced via aria-live.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ title: "Model refreshed", variant: "success" });
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; color: string }
> = {
  success: { icon: CheckCircle2, color: "text-success" },
  error: { icon: AlertCircle, color: "text-danger" },
  info: { icon: Info, color: "text-accent" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed, bottom-right, above all content */}
      <div
        className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = variantConfig[toast.variant];
            const Icon = config.icon;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-card border border-ink-700/30",
                  "bg-ink-800/90 backdrop-blur-xl px-4 py-3 shadow-elevated",
                  "min-w-[280px] max-w-[400px]",
                )}
                role="status"
              >
                <Icon
                  className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.color)}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-100">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="text-xs text-ink-400 mt-0.5 text-pretty">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="flex-shrink-0 text-ink-500 hover:text-ink-300 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
