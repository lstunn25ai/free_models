/**
 * ProviderBadge — compact provider label with reliability indicator.
 *
 * Shows provider name + a colored dot indicating reliability.
 * Unreliable providers (>20% offline) get a warning dot + tooltip.
 *
 * Props:
 *  - name: provider display name
 *  - isUnreliable: computed reliability flag
 *  - size: "xs" | "sm"
 */

import { AlertTriangle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface ProviderBadgeProps {
  name: string;
  isUnreliable?: boolean;
  size?: "xs" | "sm";
}

export function ProviderBadge({
  name,
  isUnreliable = false,
  size = "xs",
}: ProviderBadgeProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        isUnreliable
          ? "bg-warning/5 text-warning/90 border-warning/15"
          : "bg-ink-800/40 text-ink-300 border-ink-700/30",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isUnreliable ? "bg-warning" : "bg-success",
        )}
        aria-hidden="true"
      />
      {name}
      {isUnreliable && (
        <AlertTriangle className="h-3 w-3 text-warning/70" aria-hidden="true" />
      )}
    </span>
  );

  if (isUnreliable) {
    return (
      <Tooltip content="Unreliable — over 20% of models are offline">
        {content}
      </Tooltip>
    );
  }

  return content;
}
