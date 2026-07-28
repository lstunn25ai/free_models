import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { runHealthCheck } from "../services/health-check.js";
import { requireAdmin } from "../middleware/admin-auth.js";

export const refreshRouter = Router();

/**
 * POST /api/refresh/category/:category
 * Runs health checks for all models in a category, in parallel.
 *
 * This is the "Racing Engine" — all provider→model links in the category
 * receive the same test prompt simultaneously. Results are ranked by speed.
 *
 * The table order does NOT change (static grid). Only the speed_ms and status
 * columns update dynamically.
 */
refreshRouter.post("/category/:category", requireAdmin, async (req: Request, res: Response) => {
  const categoryRaw = req.params["category"];
  if (!categoryRaw) {
    res.status(400).json({ error: "Missing category parameter" });
    return;
  }
  const categoryUpper = categoryRaw.toUpperCase();

  const validCategories = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"];
  if (!validCategories.includes(categoryUpper)) {
    res.status(400).json({ error: "Invalid category", validCategories });
    return;
  }

  // Fetch all provider→model links for this category
  const providerModels = await prisma.providerModel.findMany({
    where: {
      model: { category: categoryUpper as any },
    },
    include: {
      model: true,
      provider: true,
    },
  });

  if (providerModels.length === 0) {
    res.json({ message: "No models in this category", results: [] });
    return;
  }

  // Run health checks in parallel with a concurrency limit
  // Max 5 simultaneous requests to avoid overloading the NAS
  const MAX_CONCURRENCY = 5;
  const results: Array<{ id: string; status: string; speedMs: number | null; error: string | null }> = [];

  for (let i = 0; i < providerModels.length; i += MAX_CONCURRENCY) {
    const batch = providerModels.slice(i, i + MAX_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((pm: typeof providerModels[number]) => runHealthCheck(pm))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const settled = batchResults[j]!;
      const pm = batch[j]!;

      if (settled.status === "fulfilled") {
        results.push({
          id: pm.id,
          status: settled.value.status,
          speedMs: settled.value.speedMs,
          error: settled.value.errorMessage ?? null,
        });
      } else {
        results.push({
          id: pm.id,
          status: "OFFLINE",
          speedMs: null,
          error: settled.reason instanceof Error ? settled.reason.message : "Unknown error",
        });
      }
    }
  }

  res.json({
    category: categoryUpper,
    totalChecked: results.length,
    results,
  });
});

/**
 * POST /api/refresh/model/:id
 * Runs a health check for a single provider→model link.
 */
refreshRouter.post("/model/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = req.params["id"];
  if (!id) {
    res.status(400).json({ error: "Missing id parameter" });
    return;
  }

  const providerModel = await prisma.providerModel.findUnique({
    where: { id },
    include: {
      model: true,
      provider: true,
    },
  });

  if (!providerModel) {
    res.status(404).json({ error: "Provider model not found" });
    return;
  }

  const result = await runHealthCheck(providerModel);

  res.json({
    id: providerModel.id,
    status: result.status,
    speedMs: result.speedMs,
    error: result.errorMessage ?? null,
  });
});
