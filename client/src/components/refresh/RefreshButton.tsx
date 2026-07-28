/**
 * RefreshButton — triggers a health check for a single model.
 *
 * Shows loading spinner during the check.
 * Uses useRefreshModel mutation.
 *
 * Props:
 *  - modelId: providerModel ID to refresh
 *  - size: "sm" | "md"
 */

import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useRefreshModel } from "@/hooks/useApi";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  modelId: string;
  size?: "sm" | "md";
}

export function RefreshButton({ modelId, size = "sm" }: RefreshButtonProps) {
  const refresh = useRefreshModel();
  const { showToast } = useToast();

  const handleRefresh = () => {
    refresh.mutate(modelId, {
      onSuccess: (data) => {
        showToast({
          title: data.status === "ONLINE" ? "Model is online" : `Status: ${data.status}`,
          description: data.speedMs ? `Response: ${data.speedMs}ms` : undefined,
          variant: data.status === "ONLINE" ? "success" : "info",
        });
      },
      onError: () => {
        showToast({
          title: "Refresh failed",
          variant: "error",
        });
      },
    });
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-9 w-9";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ rotate: 180 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={handleRefresh}
      disabled={refresh.isPending}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors",
        "text-ink-500 hover:text-accent hover:bg-accent/10",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:rotate-0",
        buttonSize,
      )}
      aria-label="Refresh model health"
    >
      <RefreshCw
        className={cn(iconSize, refresh.isPending && "animate-spin")}
      />
    </motion.button>
  );
}
