import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { requireAdmin } from "../middleware/admin-auth.js";

export const providersRouter = Router();

/**
 * GET /api/providers
 * Returns all providers with computed reliability status.
 *
 * A provider is "unreliable" if >20% of its provider_models have status OFFLINE.
 */
providersRouter.get("/", async (_req: Request, res: Response) => {
  const providers = await prisma.provider.findMany({
    include: {
      providerModels: {
        select: { status: true, placements: { select: { id: true } } },
      },
      candidates: { select: { testStatus: true, quotaStatus: true } },
    },
    orderBy: { name: "asc" },
  });

  const result = providers.map((p: (typeof providers)[number]) => {
    const total = p.providerModels.length;
    const offline = p.providerModels.filter((pm: (typeof p.providerModels)[number]) => pm.status === "OFFLINE").length;
    const workingCandidates = p.candidates.filter((candidate: (typeof p.candidates)[number]) => candidate.testStatus === "ONLINE" && ["FREE", "LIMITED"].includes(candidate.quotaStatus)).length;
    const publishedModels = p.providerModels.filter((pm: (typeof p.providerModels)[number]) => pm.placements.length > 0).length;
    const isUnreliable = total > 0 && (offline / total) > 0.20;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      isEnabled: p.isEnabled,
      totalModels: total,
      offlineModels: offline,
      workingCandidates,
      publishedModels,
      isUnreliable,
    };
  });

  res.json({ providers: result });
});

/**
 * POST /api/providers
 * Add a new provider.
 *
 * Body: { name, slug, baseUrl }
 *
 * Credentials are supplied only through the runtime environment.
 */
providersRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const { name, slug, baseUrl } = req.body;

  if (!name || !slug || !baseUrl) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "slug", "baseUrl"],
    });
    return;
  }

  const provider = await prisma.provider.create({
    data: {
      name,
      slug: slug.toLowerCase(),
      baseUrl,
      apiKeyEnc: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      baseUrl: true,
      isEnabled: true,
    },
  });

  res.status(201).json(provider);
});
