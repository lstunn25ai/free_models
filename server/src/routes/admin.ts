import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { requireAdmin } from "../middleware/admin-auth.js";
import { getProviderAdapter } from "../services/health-check.js";

const CATEGORIES = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"] as const;

function suggestCategory(slug: string, name: string): string {
  const value = `${slug} ${name}`.toLowerCase();
  if (/(embed|embedding|rerank)/.test(value)) return "EMBEDDINGS";
  if (/(video|veo)/.test(value)) return "VIDEO";
  if (/(image|vision|vl|gemma.*it)/.test(value)) return "IMAGE";
  if (/(code|coder)/.test(value)) return "SONNET";
  return "DEFAULT";
}

function serializeCandidate(candidate: {
  id: string; slug: string; name: string; isFree: boolean; freeSource: string | null;
  categorySuggestion: string | null; reviewStatus: string; testStatus: string; speedMs: number | null;
  errorMessage: string | null; lastChecked: Date | null; discoveredAt: Date; provider: { id: string; name: string; slug: string };
}) {
  return {
    ...candidate,
    lastChecked: candidate.lastChecked?.toISOString() ?? null,
    discoveredAt: candidate.discoveredAt.toISOString(),
  };
}

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/providers", async (_req: Request, res: Response) => {
  const providers = await prisma.provider.findMany({
    include: { _count: { select: { candidates: true, providerModels: true } } },
    orderBy: { name: "asc" },
  });
  res.json({ providers: providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    configured: Boolean(getProviderAdapter(provider.slug)),
    isEnabled: provider.isEnabled,
    candidateCount: provider._count.candidates,
    approvedModelCount: provider._count.providerModels,
  })) });
});

adminRouter.get("/candidates", async (req: Request, res: Response) => {
  const providerSlug = typeof req.query.provider === "string" ? req.query.provider : undefined;
  const candidates = await prisma.candidateModel.findMany({
    where: providerSlug ? { provider: { slug: providerSlug } } : undefined,
    include: { provider: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ testStatus: "asc" }, { name: "asc" }],
  });
  res.json({ candidates: candidates.map(serializeCandidate) });
});

adminRouter.post("/providers/:slug/discover", async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const adapter = slug ? getProviderAdapter(slug) : undefined;
  if (!adapter) {
    res.status(409).json({ error: "Provider is not configured" });
    return;
  }
  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const discovered = await adapter.listModels();
  let imported = 0;
  for (const model of discovered) {
    await prisma.candidateModel.upsert({
      where: { providerId_slug: { providerId: provider.id, slug: model.slug } },
      update: {
        name: model.name,
        isFree: Boolean(model.isFree),
        freeSource: model.freeSource ?? null,
        categorySuggestion: model.category ?? suggestCategory(model.slug, model.name),
      },
      create: {
        providerId: provider.id,
        slug: model.slug,
        name: model.name,
        isFree: Boolean(model.isFree),
        freeSource: model.freeSource ?? null,
        categorySuggestion: model.category ?? suggestCategory(model.slug, model.name),
      },
    });
    imported++;
  }
  res.json({ provider: slug, imported, freeCandidates: discovered.filter((model) => model.isFree).length });
});

adminRouter.post("/candidates/:id/free", async (req: Request, res: Response) => {
  const isFree = req.body?.isFree;
  if (typeof isFree !== "boolean") {
    res.status(400).json({ error: "isFree must be a boolean" });
    return;
  }
  const candidate = await prisma.candidateModel.update({
    where: { id: req.params.id },
    data: { isFree, freeSource: isFree ? "Manual administrator verification" : null },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.json({ candidate: serializeCandidate(candidate) });
});

adminRouter.post("/candidates/:id/test", async (req: Request, res: Response) => {
  const candidate = await prisma.candidateModel.findUnique({
    where: { id: req.params.id },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  if (!candidate.isFree) {
    res.status(409).json({ error: "Verify the model as free before testing it" });
    return;
  }
  const adapter = getProviderAdapter(candidate.provider.slug);
  if (!adapter) {
    res.status(409).json({ error: "Provider is not configured" });
    return;
  }
  const result = await adapter.healthCheck(candidate.slug);
  const updated = await prisma.candidateModel.update({
    where: { id: candidate.id },
    data: { testStatus: result.status, speedMs: result.speedMs, errorMessage: result.errorMessage, lastChecked: new Date() },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.json({ candidate: serializeCandidate(updated) });
});

adminRouter.post("/candidates/:id/approve", async (req: Request, res: Response) => {
  const category = typeof req.body?.category === "string" ? req.body.category.toUpperCase() : "";
  const stars = typeof req.body?.stars === "number" ? req.body.stars : 3;
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number]) || !Number.isFinite(stars) || stars < 3 || stars > 5) {
    res.status(400).json({ error: "Invalid category or stars" });
    return;
  }
  const candidate = await prisma.candidateModel.findUnique({
    where: { id: req.params.id },
    include: { provider: true },
  });
  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }
  if (!candidate.isFree || candidate.testStatus !== "ONLINE") {
    res.status(409).json({ error: "Only free candidates with a successful test can be approved" });
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const model = await tx.model.upsert({
      where: { slug: candidate.slug },
      update: { name: candidate.name, category, stars },
      create: { name: candidate.name, slug: candidate.slug, category, stars },
    });
    await tx.providerModel.upsert({
      where: { modelId_providerId: { modelId: model.id, providerId: candidate.providerId } },
      update: { status: "ONLINE", speedMs: candidate.speedMs, errorMessage: null, lastChecked: candidate.lastChecked },
      create: { modelId: model.id, providerId: candidate.providerId, status: "ONLINE", speedMs: candidate.speedMs, lastChecked: candidate.lastChecked },
    });
    await tx.candidateModel.update({ where: { id: candidate.id }, data: { reviewStatus: "APPROVED" } });
    return model;
  });
  res.status(201).json({ model: result });
});

adminRouter.post("/candidates/:id/reject", async (req: Request, res: Response) => {
  await prisma.candidateModel.update({ where: { id: req.params.id }, data: { reviewStatus: "REJECTED" } });
  res.status(204).end();
});
