/**
 * ModelCard — the fundamental unit of the dashboard.
 *
 * Shows a model with all its provider links, health status, speed,
 * feedback (Health Circle), and racing position.
 *
 * Layout (Double-Bezel Card):
 *  ┌────────────────────────────────────────────┐
 *  │  Model Name          ⭐ 4.5   [priority]    │
 *  │  advantage text                              │
 *  │  ────────────────────────────────────       │
 *  │  Provider rows:                              │
 *  │  [Provider] ●Online  300ms ▲  [HealthCircle] │
 *  │  [Provider] ●Offline  —    [HealthCircle]    │
 *  └────────────────────────────────────────────┘
 *
 * Props:
 *  - model: Model
 *  - categoryProviders: providers with reliability data (for badge)
 *  - isRacing: whether this category is currently racing
 *  - raceResults: live results during a race (by providerModelId)
 */

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Copy,
  Zap,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { HealthCircle } from "@/components/health/HealthCircle";
import { FeedbackButtons } from "@/components/feedback/FeedbackButtons";
import { StatusIndicator } from "@/components/health/StatusIndicator";
import { ProviderBadge } from "@/components/model/ProviderBadge";
import {
  cn,
  formatSpeed,
  formatStars,
  formatRelativeTime,
  computeSpeedTrend,
  type SpeedTrend,
} from "@/lib/utils";
import type {
  Model,
  ProviderModel,
  ProviderWithReliability,
  RefreshResult,
} from "@/lib/types";
import { api } from "@/lib/api";

interface ModelCardProps {
  model: Model;
  providers: ProviderWithReliability[];
  isRacing?: boolean;
  raceResults?: Record<string, RefreshResult>;
}

const priorityVariant: Record<string, "accent" | "default" | "warning"> = {
  primary: "accent",
  backup: "default",
  fast: "warning",
  vision: "default",
  "code-expert": "accent",
};

const trendConfig: Record<
  SpeedTrend,
  { icon: typeof TrendingUp; color: string; label: string }
> = {
  faster: { icon: TrendingUp, color: "text-success", label: "Faster" },
  slower: { icon: TrendingDown, color: "text-danger", label: "Slower" },
  same: { icon: Minus, color: "text-ink-500", label: "No change" },
  new: { icon: Zap, color: "text-accent", label: "New measurement" },
};

function ProviderRow({
  pm,
  providerInfo,
  isRacing,
  raceResult,
}: {
  pm: ProviderModel;
  providerInfo?: ProviderWithReliability;
  isRacing?: boolean;
  raceResult?: RefreshResult;
}) {
  const [expanded, setExpanded] = useState(false);

  // Determine displayed values — race results override if racing
  const displayStatus = raceResult?.status ?? pm.status;
  const displaySpeed = raceResult?.speedMs ?? pm.speedMs;
  const previousSpeed = pm.speedMs;
  const trend = raceResult ? computeSpeedTrend(displaySpeed, previousSpeed) : "same";
  const TrendIcon = trendConfig[trend].icon;

  // Feedback: we only have feedbackCount from the models endpoint.
  // For a proper Health Circle we need up/down split — use the feedback endpoint.
  // For MVP, we approximate: feedbackCount is total, assume 70/30 split if no detail.
  // In production, the FeedbackButtons trigger a refetch that populates this.
  const feedbackCount = pm.feedbackCount ?? 0;
  const approxUp = pm.thumbsUp ?? 0;
  const approxDown = pm.thumbsDown ?? 0;

  return (
    <div className="border-t border-ink-800/40 first:border-t-0">
      <div className="flex items-center gap-3 py-2.5 px-1">
        {/* Provider badge */}
        <div className="min-w-0 flex-shrink-0">
          <ProviderBadge
            name={pm.provider.name}
            isUnreliable={providerInfo?.isUnreliable}
          />
        </div>

        {/* Status */}
        <div className="flex-shrink-0">
          <StatusIndicator status={displayStatus as any} size="sm" />
        </div>

        {/* Speed + trend */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
          <AnimatePresence mode="wait">
            {isRacing && !raceResult ? (
              <motion.span
                key="racing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-accent tabular-nums"
              >
                ...
              </motion.span>
            ) : (
              <motion.span
                key="speed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs tabular-nums text-ink-300"
              >
                {formatSpeed(displaySpeed)}
              </motion.span>
            )}
          </AnimatePresence>
          {raceResult && trend !== "same" && (
            <Tooltip content={`${trendConfig[trend].label}: was ${formatSpeed(previousSpeed)}`}>
              <TrendIcon
                className={cn("h-3 w-3", trendConfig[trend].color)}
                aria-hidden="true"
              />
            </Tooltip>
          )}
        </div>

        {/* Error tooltip for offline */}
        {(displayStatus === "OFFLINE" || displayStatus === "DEGRADED") &&
          (raceResult?.error || pm.errorMessage) && (
            <Tooltip content={raceResult?.error || pm.errorMessage || "Unknown error"}>
              <span className="text-xs text-ink-500 cursor-help" aria-label="Error details">
                ⚠
              </span>
            </Tooltip>
          )}

        {/* Health Circle */}
        <div className="flex-shrink-0">
          <HealthCircle up={approxUp} down={approxDown} size={32} />
        </div>

        {/* Per provider/model feedback */}
        <FeedbackButtons
          providerModelId={pm.id}
          disabled={isRacing}
        />

        {/* Expand for details — always show, but only show toggle if there are details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-ink-500 hover:text-ink-300 transition-colors p-0.5"
          aria-label={expanded ? "Collapse details" : "Expand details"}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 ease-fluid",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
              {pm.lastChecked && (
                <div className="flex items-center gap-1.5">
                  <span className="text-ink-500">Last check:</span>
                  <span className="text-ink-300">{formatRelativeTime(pm.lastChecked)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-ink-500">Feedback:</span>
                <span className="text-ink-300 tabular-nums">{feedbackCount} votes</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ModelCard({
  model,
  providers,
  isRacing = false,
  raceResults = {},
}: ModelCardProps) {
  const queryClient = useQueryClient();
  const removePlacement = useMutation({ mutationFn: api.removePlacement, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }) });
  return (
    <Card padding="md" hover className="h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-ink-100 truncate">
            {model.name}
          </h3>
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <button
              type="button"
              className="text-[11px] text-ink-500 font-mono truncate hover:text-ink-200 transition-colors text-left"
              title="Скопировать точный model ID провайдера"
              onClick={() => void navigator.clipboard.writeText(model.slug)}
            >
              {model.slug}
            </button>
            <Copy className="h-3 w-3 text-ink-600 flex-shrink-0" aria-hidden="true" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-warning fill-warning" aria-hidden="true" />
            <span className="text-xs font-medium tabular-nums text-ink-200">
              {formatStars(model.stars)}
            </span>
          </div>
          {model.priority && (
            <Badge variant={priorityVariant[model.priority] ?? "default"} size="xs">
              {model.priority}
            </Badge>
          )}
          {model.placementId && <button type="button" className="text-ink-500 hover:text-danger" aria-label="Убрать из этой роли" title="Убрать из этой роли" disabled={removePlacement.isPending} onClick={() => removePlacement.mutate(model.placementId!)}><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>

      {/* Advantage line */}
      {model.advantage && (
        <p className="text-xs text-ink-400 mb-3 text-pretty">{model.advantage}</p>
      )}

      {/* Provider rows */}
      <div className="-mx-1">
        {model.providerModels.map((pm) => {
          const providerInfo = providers.find((p) => p.id === pm.provider.id);
          return (
            <ProviderRow
              key={pm.id}
              pm={pm}
              providerInfo={providerInfo}
              isRacing={isRacing}
              raceResult={raceResults[pm.id]}
            />
          );
        })}
      </div>
    </Card>
  );
}
