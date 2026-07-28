/**
 * Utility functions — shared across the app.
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[];

/**
 * Lightweight class name combiner — no external dependency.
 * Handles strings, conditionals, and arrays.
 */
export function cn(...inputs: ClassValue[]): string {
  const parts: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      parts.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) parts.push(nested);
    }
  }
  return parts.join(" ");
}

// ─── Health Circle ───────────────────────────────────────────────────

/**
 * Compute Health Circle fill percentage.
 * Formula: (up - down) * 20%
 * Range: -100% (full red) to +100% (full green)
 * Cap: 5 net positive votes = 100%
 */
export function computeHealthCircle(up: number, down: number): number {
  const net = up - down;
  const raw = net * 20;
  return Math.max(-100, Math.min(100, raw));
}

// ─── Formatting ──────────────────────────────────────────────────────

/** Format milliseconds for display: "300ms", "1.2s" */
export function formatSpeed(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Format relative time: "just now", "5m ago", "2h ago", "3d ago" */
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/** Format stars for display: "5.0", "4.5", "3.0" */
export function formatStars(stars: number): string {
  return stars.toFixed(1);
}

// ─── Category Metadata ───────────────────────────────────────────────

export const CATEGORY_META: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  OPUS: { label: "Opus", description: "Heavy reasoning tier", icon: "brain" },
  SONNET: { label: "Sonnet", description: "Balanced quality & speed", icon: "scale" },
  HAIKU: { label: "Haiku", description: "Ultra-fast responses", icon: "zap" },
  FABLE: { label: "Fable", description: "Benchmark reference", icon: "book-open" },
  IMAGE: { label: "Image", description: "Image generation", icon: "image" },
  VIDEO: { label: "Video", description: "Video generation", icon: "film" },
  EMBEDDINGS: { label: "Embeddings", description: "Vector embeddings", icon: "vector" },
  DEFAULT: { label: "Default", description: "Router — multimodal dispatch", icon: "shuffle" },
};

/** Ordered category list for display */
export const CATEGORY_ORDER = [
  "OPUS",
  "SONNET",
  "HAIKU",
  "FABLE",
  "IMAGE",
  "VIDEO",
  "EMBEDDINGS",
  "DEFAULT",
] as const;

// ─── Status Colors ───────────────────────────────────────────────────

export function statusColor(status: string): {
  text: string;
  bg: string;
  glow: string;
  dot: string;
} {
  switch (status) {
    case "ONLINE":
      return {
        text: "text-success",
        bg: "bg-success/10",
        glow: "shadow-[0_0_8px_oklch(0.70_0.18_145/0.3)]",
        dot: "bg-success",
      };
    case "OFFLINE":
      return {
        text: "text-danger",
        bg: "bg-danger/10",
        glow: "shadow-[0_0_8px_oklch(0.62_0.22_25/0.3)]",
        dot: "bg-danger",
      };
    case "DEGRADED":
      return {
        text: "text-warning",
        bg: "bg-warning/10",
        glow: "shadow-[0_0_8px_oklch(0.75_0.15_85/0.3)]",
        dot: "bg-warning",
      };
    default:
      return {
        text: "text-ink-400",
        bg: "bg-ink-800/50",
        glow: "",
        dot: "bg-ink-500",
      };
  }
}

// ─── Speed Trend ─────────────────────────────────────────────────────

export type SpeedTrend = "faster" | "slower" | "same" | "new";

export function computeSpeedTrend(
  current: number | null,
  previous: number | null,
): SpeedTrend {
  if (current === null) return "new";
  if (previous === null) return "new";
  if (current < previous) return "faster";
  if (current > previous) return "slower";
  return "same";
}
