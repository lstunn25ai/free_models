/**
 * StatusIndicator — compact status dot + label for provider-model health.
 *
 * Shows PENDING / ONLINE / OFFLINE / DEGRADED with appropriate color.
 * Includes a subtle pulse animation for ONLINE (breathing glow).
 *
 * Props:
 *  - status: HealthStatus
 *  - showLabel: whether to show text label alongside the dot
 *  - size: "xs" | "sm" | "md"
 */

import { motion } from "framer-motion";
import { cn, statusColor } from "@/lib/utils";
import type { HealthStatus } from "@/lib/types";

type Size = "xs" | "sm" | "md";

interface StatusIndicatorProps {
  status: HealthStatus;
  showLabel?: boolean;
  size?: Size;
}

const dotSizes: Record<Size, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

const labelMap: Record<HealthStatus, string> = {
  PENDING: "Pending",
  ONLINE: "Online",
  OFFLINE: "Offline",
  DEGRADED: "Degraded",
};

export function StatusIndicator({
  status,
  showLabel = false,
  size = "sm",
}: StatusIndicatorProps) {
  const colors = statusColor(status);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex">
        <span
          className={cn("rounded-full", dotSizes[size], colors.dot)}
          aria-hidden="true"
        />
        {status === "ONLINE" && (
          <motion.span
            className={cn(
              "absolute inset-0 rounded-full",
              colors.dot,
            )}
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            aria-hidden="true"
          />
        )}
      </span>
      {showLabel && (
        <span className={cn("text-xs font-medium", colors.text)}>
          {labelMap[status]}
        </span>
      )}
    </span>
  );
}
