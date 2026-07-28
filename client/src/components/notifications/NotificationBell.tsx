/**
 * NotificationBell — bell icon with badge count + dropdown panel.
 *
 * Shows newly discovered models grouped by provider.
 * Each notification can be acknowledged (marks as added).
 *
 * Props:
 *  - none — fetches its own data via useNotifications
 */

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Sparkles } from "lucide-react";
import { useNotifications, useAcknowledgeNotification } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { formatRelativeTime, cn } from "@/lib/utils";

export function NotificationBell() {
  const { data, isLoading } = useNotifications();
  const acknowledge = useAcknowledgeNotification();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const totalNew = data?.totalNew ?? 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleAcknowledge = (id: string, slug: string) => {
    acknowledge.mutate(id, {
      onSuccess: () => {
        showToast({
          title: "Notification acknowledged",
          description: slug,
          variant: "success",
        });
      },
    });
  };

  return (
    <div ref={bellRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-300 hover:text-ink-100 hover:bg-ink-800/40 transition-colors"
        aria-label={`Notifications${totalNew > 0 ? `, ${totalNew} new` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {totalNew > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white"
          >
            {totalNew > 9 ? "9+" : totalNew}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-80 z-50"
          >
            <div className="bezel-outer">
              <div className="rounded-[calc(14px-1.5px)] bg-ink-900/95 backdrop-blur-xl shadow-elevated overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-800/50">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="text-sm font-medium text-ink-100">
                    New Models
                  </span>
                  {totalNew > 0 && (
                    <span className="text-xs text-ink-400 ml-auto tabular-nums">
                      {totalNew} discovered
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-80 overflow-y-auto">
                  {isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-ink-500">
                      Loading...
                    </div>
                  ) : totalNew === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-ink-500">
                      No new models discovered
                    </div>
                  ) : (
                    data?.providers.map((group) => (
                      <div key={group.providerSlug}>
                        <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-ink-500 bg-ink-800/20">
                          {group.providerName}
                        </div>
                        {group.models.map((nm) => (
                          <div
                            key={nm.id}
                            className="flex items-center gap-2 px-4 py-2.5 hover:bg-ink-800/30 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-mono text-ink-200 truncate">
                                {nm.slug}
                              </p>
                              <p className="text-[10px] text-ink-500 mt-0.5">
                                {nm.category && `${nm.category} · `}
                                {formatRelativeTime(nm.discoveredAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAcknowledge(nm.id, nm.slug)}
                              disabled={acknowledge.isPending}
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-lg",
                                "text-ink-500 hover:text-success hover:bg-success/10 transition-colors",
                                "disabled:opacity-40",
                              )}
                              aria-label="Acknowledge — mark as added"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
