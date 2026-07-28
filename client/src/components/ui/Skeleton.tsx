/**
 * Skeleton — shimmer placeholder for loading states.
 *
 * Props:
 *  - variant: "text" | "rect" | "circle"
 *  - width / height: explicit dimensions (else full-width)
 *  - className: additional Tailwind classes
 *
 * Use multiple Skeletons to compose loading previews that match
 * the real layout — prevents layout shift (CLS).
 */

import { cn } from "@/lib/utils";

type Variant = "text" | "rect" | "circle";

interface SkeletonProps {
  variant?: Variant;
  className?: string;
}

export function Skeleton({ variant = "rect", className }: SkeletonProps) {
  const base = "skeleton-shimmer rounded-md";

  if (variant === "circle") {
    return (
      <div
        className={cn(base, "rounded-full", className)}
        aria-hidden="true"
      />
    );
  }

  if (variant === "text") {
    return (
      <div
        className={cn(base, "h-3.5", className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={cn(base, "h-4", className)}
      aria-hidden="true"
    />
  );
}

/**
 * SkeletonText — composes a multi-line text block placeholder.
 */
export function SkeletonText({
  lines = 2,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
