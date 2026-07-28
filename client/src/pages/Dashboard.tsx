/**
 * Dashboard — the main page.
 *
 * Shows all model categories as sections with bento grids.
 * Fetches models + providers in parallel.
 * Handles loading, error, and empty states at the page level.
 */

import { motion } from "framer-motion";
import { useModels, useProviders } from "@/hooks/useApi";
import { CategorySection } from "@/components/model/CategorySection";
import { ErrorState } from "@/components/ui/ErrorState";
import { CATEGORY_ORDER } from "@/lib/utils";

export function Dashboard() {
  const modelsQuery = useModels();
  const providersQuery = useProviders();

  // Both queries must be loaded
  const isLoading = modelsQuery.isLoading || providersQuery.isLoading;
  const isError = modelsQuery.isError || providersQuery.isError;

  const categories = modelsQuery.data?.categories ?? {};
  const providers = providersQuery.data?.providers ?? [];

  if (isError) {
    return (
      <div className="pt-24 px-4 max-w-7xl mx-auto">
        <ErrorState
          fullHeight
          message="Failed to load dashboard data. Check that the server is running."
          onRetry={() => {
            modelsQuery.refetch();
            providersQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10"
      >
        <h1 className="text-display font-medium text-ink-100 text-balance">
          Free Models Rating
        </h1>
        <p className="text-sm text-ink-400 mt-2 text-pretty max-w-xl">
          Real-time health, speed, and community trust for free AI models
          across providers.
        </p>
      </motion.div>

      {/* Provider reliability summary */}
      {!isLoading && providers.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-10 flex flex-wrap items-center gap-2"
        >
          <span className="text-xs text-ink-500 mr-1">Providers:</span>
          {providers.map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                p.isUnreliable
                  ? "bg-warning/5 text-warning/90 border-warning/15"
                  : "bg-ink-800/40 text-ink-300 border-ink-700/30"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  p.isUnreliable ? "bg-warning" : "bg-success"
                }`}
              />
              {p.name}
              <span className="text-ink-500 tabular-nums">
                {p.totalModels - p.offlineModels}/{p.totalModels}
              </span>
            </span>
          ))}
        </motion.div>
      )}

      {/* Category sections */}
      {isLoading ? (
        // Show skeleton sections
        CATEGORY_ORDER.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            models={[]}
            providers={[]}
            isLoading
          />
        ))
      ) : (
        CATEGORY_ORDER.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            models={categories[cat] ?? []}
            providers={providers}
            isError={modelsQuery.isError}
            onRetry={() => modelsQuery.refetch()}
          />
        ))
      )}
    </div>
  );
}
