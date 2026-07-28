/**
 * Badge — compact pill for tags, status, and metadata.
 *
 * Props:
 *  - variant: "default" | "success" | "warning" | "danger" | "accent"
 *  - size: "xs" | "sm"
 *  - dot: adds a leading status dot
 */

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "accent";
type Size = "xs" | "sm";

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-ink-800/60 text-ink-300 border-ink-700/30",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  accent: "bg-accent/10 text-accent border-accent/20",
};

const sizeStyles: Record<Size, string> = {
  xs: "text-[10px] px-2 py-0.5 gap-1",
  sm: "text-xs px-2.5 py-1 gap-1.5",
};

const dotColors: Record<Variant, string> = {
  default: "bg-ink-500",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent",
};

export function Badge({
  variant = "default",
  size = "xs",
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium tracking-wide",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
