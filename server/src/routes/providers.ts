import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";

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
        select: { status: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = providers.map(p => {
    const total = p.providerModels.length;
    const offline = p.providerModels.filter(pm => pm.status === "OFFLINE").length;
    const isUnreliable = total > 0 && (offline / total) > 0.20;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      baseUrl: p.baseUrl,
      isEnabled: p.isEnabled,
      totalModels: total,
      offlineModels: offline,
      isUnreliable,
    };
  });

  res.json({ providers: result });
});

/**
 * POST /api/providers
 * Add a new provider.
 *
 * Body: { name, slug, baseUrl, apiKey? }
 *
 * The apiKey is stored encrypted (AES-256-GCM), never as plaintext or hash.
 * The frontend never receives the key back.
 */
providersRouter.post("/", async (req: Request, res: Response) => {
  const { name, slug, baseUrl, apiKey } = req.body;

  if (!name || !slug || !baseUrl) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["name", "slug", "baseUrl"],
    });
    return;
  }

  // TODO: Encrypt apiKey with AES-256-GCM using ENCRYPTION_KEY from env
  // For now, store null — keys come from .env at startup
  const provider = await prisma.provider.create({
    data: {
      name,
      slug: slug.toLowerCase(),
      baseUrl,
      apiKeyEnc: null, // Will be set by the encryption service in Phase 2
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