/**
 * CategorySection — a category block within the dashboard.
 *
 * Contains:
 *  - Category header (icon, label, description, model count)
 *  - Race button (racing engine trigger)
 *  - Bento grid of ModelCards
 *
 * The grid uses auto-fit minmax for responsive layout without breakpoints.
 * During a race, cards show live results.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Scale,
  Zap,
  BookOpen,
  Image as ImageIcon,
  Film,
  Waypoints,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import { ModelCard } from "@/components/model/ModelCard";
import { RaceButton } from "@/components/refresh/RaceButton";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CATEGORY_META } from "@/lib/utils";
import type {
  Model,
  ProviderWithReliability,
  RefreshResult,
} from "@/lib/types";

const categoryIcons: Record<string, LucideIcon> = {
  brain: Brain,
  scale: Scale,
  zap: Zap,
  "book-open": BookOpen,
  image: ImageIcon,
  film: Film,
  vector: Waypoints,
  shuffle: Shuffle,
};

interface CategorySectionProps {
  category: string;
  models: Model[];
  providers: ProviderWithReliability[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

// Staggered card entrance variants
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function CategorySection({
  category,
  models,
  providers,
  isLoading = false,
  isError = false,
  onRetry,
}: CategorySectionProps) {
  const [raceResults, setRaceResults] = useState<
    Record<string, RefreshResult>
  >({});
  const [isRacing, setIsRacing] = useState(false);

  const meta = CATEGORY_META[category] ?? {
    label: category,
    description: "",
    icon: "brain",
  };
  const Icon = categoryIcons[meta.icon] ?? Brain;

  const modelCount = models.length;

  // Sort models by stars (descending) — static ranking
  const sortedModels = useMemo(
    () => [...models].sort((a, b) => b.stars - a.stars),
    [models],
  );

  return (
    <section className="mb-12" aria-labelledby={`cat-${category}`}>
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-800/50 border border-ink-700/30">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2
              id={`cat-${category}`}
              className="text-base font-medium text-ink-100"
            >
              {meta.label}
            </h2>
            <p className="text-xs text-ink-500">{meta.description}</p>
          </div>
          <span className="text-xs text-ink-400 tabular-nums ml-1">
            {modelCount} {modelCount === 1 ? "model" : "models"}
          </span>
        </div>

        {/* Race button */}
        {!isLoading && !isError && modelCount > 0 && (
          <RaceButton
            category={category}
            modelCount={modelCount}
            onRaceStart={() => {
              setIsRacing(true);
              setRaceResults({});
            }}
            onRaceComplete={(results) => {
              setRaceResults(results);
              setIsRacing(false);
            }}
          />
        )}
      </div>

      {/* Content states */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Skeleton variant="text" className="w-2/3 mb-2" />
                  <Skeleton variant="text" className="w-1/2 h-3" />
                </div>
                <Skeleton variant="rect" className="w-12 h-5 rounded-full" />
              </div>
              <SkeletonText lines={1} className="mb-3" />
              <div className="border-t border-ink-800/40 pt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton variant="rect" className="w-20 h-5 rounded-full" />
                  <Skeleton variant="circle" className="w-4 h-4" />
                  <Skeleton variant="text" className="w-10 ml-auto" />
                  <Skeleton variant="circle" className="w-8 h-8" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card padding="none">
          <ErrorState
            message="Failed to load models for this category"
            onRetry={onRetry}
          />
        </Card>
      ) : modelCount === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Icon}
            title="No models in this category"
            description={`Models will appear here once they pass the funnel ranking for ${meta.label}.`}
          />
        </Card>
      ) : (
        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        >
          {sortedModels.map((model) => (
            <motion.div key={model.id} variants={cardVariants}>
              <ModelCard
                model={model}
                providers={providers}
                isRacing={isRacing}
                raceResults={raceResults}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
