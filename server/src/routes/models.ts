import { Router, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";

export const modelsRouter = Router();

/**
 * GET /api/models
 * Returns all models grouped by category, with provider health data and feedback counts.
 *
 * Response shape:
 * {
 *   categories: {
 *     OPUS: [{ id, name, slug, stars, priority, advantage, bestFor, whenToUse,
 *              providerModels: [{ id, status, speedMs, thumbsUp, thumbsDown }] }],
 *     SONNET: [...],
 *     ...
 *   }
 * }
 */
modelsRouter.get("/", async (_req: Request, res: Response) => {
  const models = await prisma.model.findMany({
    include: {
      providerModels: {
        include: {
          provider: { select: { id: true, name: true, slug: true } },
          _count: { select: { feedback: true } },
        },
        orderBy: { speedMs: "asc" },
      },
    },
    orderBy: [
      { category: "asc" },
      { stars: "desc" },
    ],
  });

  // Group by category
  const grouped: Record<string, unknown[]> = {};
  for (const model of models) {
    if (!grouped[model.category]) grouped[model.category] = [];
    grouped[model.category].push({
      id: model.id,
      name: model.name,
      slug: model.slug,
      category: model.category,
      stars: model.stars,
      priority: model.priority,
      advantage: model.advantage,
      bestFor: model.bestFor,
      whenToUse: model.whenToUse,
      providerModels: model.providerModels.map((pm: (typeof model.providerModels)[number]) => ({
        id: pm.id,
        status: pm.status,
        speedMs: pm.speedMs,
        errorMessage: pm.errorMessage,
        lastChecked: pm.lastChecked,
        provider: pm.provider,
        feedbackCount: pm._count.feedback,
      })),
    });
  }

  res.json({ categories: grouped });
});

/**
 * GET /api/models/:category
 * Returns models for a single category.
 */
modelsRouter.get("/:category", async (req: Request, res: Response) => {
  const { category } = req.params;
  const categoryUpper = category.toUpperCase();

  // Validate category
  const validCategories = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"];
  if (!validCategories.includes(categoryUpper)) {
    res.status(400).json({ error: "Invalid category", validCategories });
    return;
  }

  const models = await prisma.model.findMany({
    where: { category: categoryUpper },
    include: {
      providerModels: {
        include: {
          provider: { select: { id: true, name: true, slug: true } },
          _count: { select: { feedback: true } },
        },
        orderBy: { speedMs: "asc" },
      },
    },
    orderBy: { stars: "desc" },
  });

  res.json({ models });
});

/**
 * POST /api/models
 * Manually add a new model to a category (admin panel).
 *
 * Body: { name, slug, category, stars?, priority?, advantage?, bestFor?, whenToUse?, providerId }
 */
modelsRouter.post("/", async (req: Request, res: Response) => {
  const { name, slug, category, priority, advantage, bestFor, whenToUse, providerId } = req.body;

  // Validate required fields
  if (!name || !slug || !category || !providerId) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "slug", "category", "providerId"],
    });
    return;
  }

  // Validate category
  const validCategories = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"];
  if (!validCategories.includes(category.toUpperCase())) {
    res.status(400).json({ error: "Invalid category", validCategories });
    return;
  }

  // Check if provider exists
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }

  // Create model + provider_model link in a transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const model = await tx.model.create({
      data: {
        name,
        slug,
        category: category.toUpperCase() as any,
        priority: priority ?? null,
        advantage: advantage ?? null,
        bestFor: bestFor ?? null,
        whenToUse: whenToUse ?? null,
      },
    });

    const providerModel = await tx.providerModel.create({
      data: {
        modelId: model.id,
        providerId,
      },
    });

    return { model, providerModel };
  });

  res.status(201).json(result);
});
