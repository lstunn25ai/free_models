/**
 * HealthCircle — SVG-based animated circle showing community trust.
 *
 * Formula: (up - down) * 20%, clamped to [-100, 100]
 * - Positive → green fill (clockwise from top)
 * - Negative → red fill (counter-clockwise from top)
 * - Zero → empty/neutral
 *
 * The fill animates with spring physics when values change.
 * A tooltip shows raw up/down counts.
 *
 * Props:
 *  - up: thumbs up count
 *  - down: thumbs down count
 *  - size: pixel diameter (default 36)
 *  - showTooltip: whether to wrap in tooltip
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Tooltip } from "@/components/ui/Tooltip";
import { computeHealthCircle, cn } from "@/lib/utils";

interface HealthCircleProps {
  up: number;
  down: number;
  size?: number;
  showTooltip?: boolean;
}

export function HealthCircle({
  up,
  down,
  size = 36,
  showTooltip = true,
}: HealthCircleProps) {
  const percentage = computeHealthCircle(up, down);
  const isPositive = percentage >= 0;
  const absPercentage = Math.abs(percentage);

  // SVG arc math
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - absPercentage / 100);

  const color = useMemo(() => {
    if (percentage === 0) return "oklch(0.50 0.01 270)"; // neutral gray
    if (isPositive) return "oklch(0.70 0.18 145)"; // green
    return "oklch(0.62 0.22 25)"; // red
  }, [percentage, isPositive]);

  const glowColor = useMemo(() => {
    if (percentage === 0) return "transparent";
    if (isPositive) return "oklch(0.70 0.18 145 / 0.3)";
    return "oklch(0.62 0.22 25 / 0.3)";
  }, [percentage, isPositive]);

  const circle = (
    <div
      className={cn("relative inline-flex items-center justify-center")}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Health: ${up} up, ${down} down, ${percentage}% positive`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="-rotate-90"
      >
        {/* Background track */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="oklch(0.20 0.005 270)"
          strokeWidth="3"
        />
        {/* Fill arc — animated with spring */}
        <motion.circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{
            filter: glowColor !== "transparent" ? `drop-shadow(0 0 4px ${glowColor})` : undefined,
          }}
        />
      </svg>
      {/* Center count */}
      <span className="absolute text-[10px] font-medium tabular-nums text-ink-200">
        {up + down > 0 ? up + down : ""}
      </span>
    </div>
  );

  if (!showTooltip) return circle;

  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-0.5">
          <span className="text-success">▲ {up} up</span>
          <span className="text-danger">▼ {down} down</span>
          <span className="text-ink-400">{percentage > 0 ? "+" : ""}{percentage}%</span>
        </div>
      }
    >
      {circle}
    </Tooltip>
  );
}
