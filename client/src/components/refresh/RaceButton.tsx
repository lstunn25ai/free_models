/**
 * RaceButton — triggers the Racing Engine for an entire category.
 *
 * All provider→model links in the category receive the same test prompt
 * simultaneously. Results stream back ranked by speed.
 *
 * Shows a progress bar during the race and a summary on completion.
 *
 * Props:
 *  - category: the category to race
 *  - modelCount: number of models (for progress display)
 *  - onRaceStart: callback when race begins
 *  - onRaceComplete: callback with results
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRefreshCategory } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import type { RefreshResult } from "@/lib/types";

interface RaceButtonProps {
  category: string;
  modelCount: number;
  onRaceStart?: () => void;
  onRaceComplete?: (results: Record<string, RefreshResult>) => void;
}

export function RaceButton({
  category,
  modelCount,
  onRaceStart,
  onRaceComplete,
}: RaceButtonProps) {
  const refresh = useRefreshCategory();
  const { showToast } = useToast();
  const [progress, setProgress] = useState(0);

  // Simulate progress during the race (the API is all-or-nothing,
  // but we animate a progress bar for perceived performance)
  useEffect(() => {
    if (!refresh.isPending) {
      setProgress(0);
      return;
    }
    setProgress(10);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 90));
    }, 400);
    return () => clearInterval(interval);
  }, [refresh.isPending]);

  const handleRace = () => {
    onRaceStart?.();
    refresh.mutate(category, {
      onSuccess: (data) => {
        setProgress(100);
        const resultsMap: Record<string, RefreshResult> = {};
        for (const r of data.results) {
          resultsMap[r.id] = r;
        }
        onRaceComplete?.(resultsMap);

        const online = data.results.filter((r) => r.status === "ONLINE").length;
        showToast({
          title: "Race complete",
          description: `${online}/${data.totalChecked} models online`,
          variant: online > 0 ? "success" : "error",
        });
      },
      onError: () => {
        showToast({
          title: "Race failed",
          description: "Could not complete the health check race",
          variant: "error",
        });
      },
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant={refresh.isPending ? "secondary" : "primary"}
        size="sm"
        isLoading={refresh.isPending}
        leftIcon={!refresh.isPending && <Flag className="h-3.5 w-3.5" />}
        onClick={handleRace}
        disabled={modelCount === 0}
      >
        {refresh.isPending ? "Racing..." : "Race All"}
      </Button>

      {/* Progress bar */}
      <AnimatePresence>
        {refresh.isPending && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2"
          >
            <div className="h-1.5 w-24 rounded-full bg-ink-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-400">
              {Math.round(progress)}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion check */}
      <AnimatePresence>
        {progress === 100 && !refresh.isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
