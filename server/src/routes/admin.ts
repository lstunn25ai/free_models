import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { requireAdmin } from "../middleware/admin-auth.js";
import { getProviderAdapter } from "../services/health-check.js";
import { classifyQuota, recommendRole, type QuotaStatus } from "../services/model-funnel.js";

const CATEGORIES = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"] as const;

function suggestCategory(slug: string, name: string): string {
  const value = `${slug} ${name}`.toLowerCase();
  if (/(embed|embedding|rerank)/.test(value)) return "EMBEDDINGS";
  if (/(video|veo)/.test(value)) return "VIDEO";
  if (/(image|vision|vl|gemma.*it)/.test(value)) return "IMAGE";
  if (/(code|coder)/.test(value)) return "SONNET";
  return "DEFAULT";
}

async function quotaFor(providerSlug: string, modelSlug: string) {
  const rules = await prisma.quotaRule.findMany({ where: { providerSlug } });
  const rule = rules
    .filter((candidate) => modelSlug === candidate.modelPattern || modelSlug.includes(candidate.modelPattern))
    .sort((left, right) => right.modelPattern.length - left.modelPattern.length)[0];
  return classifyQuota(rule ? { status: rule.status as QuotaStatus, limit: rule.limit, period: rule.period } : undefined);
}

function roleFor(slug: string, name: string, category?: string) {
  return recommendRole({ slug, name, modality: category === "IMAGE" ? "vision" : undefined });
}

function serializeCandidate(candidate: {
  id: string; slug: string; name: string; isFree: boolean; freeSource: string | null;
  quotaStatus: string; quotaLimit: string | null; quotaPeriod: string | null; quotaSource: string | null; quotaCheckedAt: Date | null;
  categorySuggestion: string | null; roleScore: number | null; roleReason: string | null; priority: string | null; hidden: boolean;
  reviewStatus: string; testStatus: string; speedMs: number | null;
  errorMessage: string | null; lastChecked: Date | null; discoveredAt: Date; provider: { id: string; name: string; slug: string };
}) {
  return {
    ...candidate,
    lastChecked: candidate.lastChecked?.toISOString() ?? null,
    quotaCheckedAt: candidate.quotaCheckedAt?.toISOString() ?? null,
    discoveredAt: candidate.discoveredAt.toISOString(),
  };
}

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/quota-rules", async (_req: Request, res: Response) => {
  res.json({ rules: await prisma.quotaRule.findMany({ orderBy: [{ providerSlug: "asc" }, { modelPattern: "asc" }] }) });
});

adminRouter.post("/quota-rules", async (req: Request, res: Response) => {
  const providerSlug = typeof req.body?.providerSlug === "string" ? req.body.providerSlug.trim() : "";
  const modelPattern = typeof req.body?.modelPattern === "string" ? req.body.modelPattern.trim() : "";
  const status = req.body?.status;
  if (!providerSlug || !modelPattern || !["FREE", "LIMITED"].includes(status)) {
    res.status(400).json({ error: "providerSlug, modelPattern and status FREE or LIMITED are required" });
    return;
  }
  const rule = await prisma.quotaRule.upsert({
    where: { providerSlug_modelPattern: { providerSlug, modelPattern } },
    update: { status, limit: typeof req.body.limit === "string" ? req.body.limit : null, period: typeof req.body.period === "string" ? req.body.period : null, source: typeof req.body.source === "string" ? req.body.source : null, notes: typeof req.body.notes === "string" ? req.body.notes : null, checkedAt: new Date() },
    create: { providerSlug, modelPattern, status, limit: typeof req.body.limit === "string" ? req.body.limit : null, period: typeof req.body.period === "string" ? req.body.period : null, source: typeof req.body.source === "string" ? req.body.source : null, notes: typeof req.body.notes === "string" ? req.body.notes : null },
  });
  res.status(201).json({ rule });
});

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
    const quota = await quotaFor(provider.slug, model.slug);
    const category = model.category ?? suggestCategory(model.slug, model.name);
    const role = roleFor(model.slug, model.name, category);
    await prisma.candidateModel.upsert({
      where: { providerId_slug: { providerId: provider.id, slug: model.slug } },
      update: {
        name: model.name,
        isFree: Boolean(model.isFree),
        freeSource: model.freeSource ?? null,
        quotaStatus: quota.status,
        quotaLimit: quota.limit,
        quotaPeriod: quota.period,
        quotaCheckedAt: quota.status === "UNKNOWN" ? null : new Date(),
        categorySuggestion: category,
        roleScore: role.score,
        roleReason: role.reason,
      },
      create: {
        providerId: provider.id,
        slug: model.slug,
        name: model.name,
        isFree: Boolean(model.isFree),
        freeSource: model.freeSource ?? null,
        quotaStatus: quota.status,
        quotaLimit: quota.limit,
        quotaPeriod: quota.period,
        quotaCheckedAt: quota.status === "UNKNOWN" ? null : new Date(),
        categorySuggestion: category,
        roleScore: role.score,
        roleReason: role.reason,
      },
    });
    imported++;
  }
  res.json({ provider: slug, imported, freeCandidates: discovered.filter((model) => model.isFree).length });
});

adminRouter.post("/providers/discover-all", async (_req: Request, res: Response) => {
  const providers = await prisma.provider.findMany({ orderBy: { slug: "asc" } });
  const results = [];
  for (const provider of providers) {
    const adapter = getProviderAdapter(provider.slug);
    if (!adapter) { results.push({ provider: provider.slug, imported: 0, error: "Provider is not configured" }); continue; }
    const discovered = await adapter.listModels();
    for (const model of discovered) {
      const quota = await quotaFor(provider.slug, model.slug);
      const category = model.category ?? suggestCategory(model.slug, model.name);
      const role = roleFor(model.slug, model.name, category);
      await prisma.candidateModel.upsert({
        where: { providerId_slug: { providerId: provider.id, slug: model.slug } },
        update: { name: model.name, quotaStatus: quota.status, quotaLimit: quota.limit, quotaPeriod: quota.period, quotaCheckedAt: quota.status === "UNKNOWN" ? null : new Date(), categorySuggestion: category, roleScore: role.score, roleReason: role.reason },
        create: { providerId: provider.id, slug: model.slug, name: model.name, isFree: false, quotaStatus: quota.status, quotaLimit: quota.limit, quotaPeriod: quota.period, quotaCheckedAt: quota.status === "UNKNOWN" ? null : new Date(), categorySuggestion: category, roleScore: role.score, roleReason: role.reason },
      });
    }
    results.push({ provider: provider.slug, imported: discovered.length });
  }
  res.json({ results });
});

adminRouter.post("/candidates/:id/free", async (req: Request, res: Response) => {
  const isFree = req.body?.isFree;
  if (typeof isFree !== "boolean") {
    res.status(400).json({ error: "isFree must be a boolean" });
    return;
  }
  const candidate = await prisma.candidateModel.update({
    where: { id: req.params.id },
    data: { isFree, freeSource: isFree ? "Manual administrator verification" : null, quotaStatus: isFree ? "FREE" : "UNKNOWN", quotaSource: isFree ? "Manual administrator verification" : null, quotaCheckedAt: isFree ? new Date() : null },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.json({ candidate: serializeCandidate(candidate) });
});

adminRouter.post("/candidates/:id/quota", async (req: Request, res: Response) => {
  const status = req.body?.status;
  if (!["FREE", "LIMITED", "UNKNOWN"].includes(status)) {
    res.status(400).json({ error: "status must be FREE, LIMITED or UNKNOWN" });
    return;
  }
  const candidate = await prisma.candidateModel.update({
    where: { id: req.params.id },
    data: {
      isFree: status === "FREE",
      freeSource: status === "FREE" ? "Manual quota registry" : null,
      quotaStatus: status,
      quotaLimit: typeof req.body.limit === "string" ? req.body.limit : null,
      quotaPeriod: typeof req.body.period === "string" ? req.body.period : null,
      quotaSource: typeof req.body.source === "string" ? req.body.source : null,
      quotaCheckedAt: status === "UNKNOWN" ? null : new Date(),
    },
    include: { provider: { select: { id: true, name: true, slug: true } } },
  });
  res.json({ candidate: serializeCandidate(candidate) });
});

adminRouter.post("/candidates/test-all", async (req: Request, res: Response) => {
  const candidates = await prisma.candidateModel.findMany({
    where: { reviewStatus: "DISCOVERED", hidden: false, ...(typeof req.body?.provider === "string" ? { provider: { slug: req.body.provider } } : {}) },
    include: { provider: { select: { id: true, name: true, slug: true } } },
    take: 100,
    orderBy: { updatedAt: "asc" },
  });
  const results = [];
  for (const candidate of candidates) {
    const adapter = getProviderAdapter(candidate.provider.slug);
    if (!adapter) {
      results.push({ id: candidate.id, status: "OFFLINE", error: "Provider is not configured" });
      continue;
    }
    const result = await adapter.healthCheck(candidate.slug);
    await prisma.candidateModel.update({ where: { id: candidate.id }, data: { testStatus: result.status, speedMs: result.speedMs, errorMessage: result.errorMessage, lastChecked: new Date() } });
    results.push({ id: candidate.id, status: result.status, speedMs: result.speedMs, error: result.errorMessage });
  }
  res.json({ totalChecked: results.length, results });
});

adminRouter.post("/candidates/:id/metadata", async (req: Request, res: Response) => {
  const category = typeof req.body?.category === "string" ? req.body.category.toUpperCase() : undefined;
  const priority = typeof req.body?.priority === "string" ? req.body.priority : undefined;
  const hidden = typeof req.body?.hidden === "boolean" ? req.body.hidden : undefined;
  const candidate = await prisma.candidateModel.update({
    where: { id: req.params.id },
    data: { ...(category ? { categorySuggestion: category } : {}), ...(priority !== undefined ? { priority } : {}), ...(hidden !== undefined ? { hidden } : {}) },
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
  if (!["FREE", "LIMITED"].includes(candidate.quotaStatus) || candidate.testStatus !== "ONLINE") {
    res.status(409).json({ error: "Only classified candidates with a successful test can be approved" });
    return;
  }
  const result = await prisma.$transaction(async (tx) => {
    const model = await tx.model.upsert({
      where: { slug: candidate.slug },
      update: { name: candidate.name, category, stars, priority: candidate.priority },
      create: { name: candidate.name, slug: candidate.slug, category, stars, priority: candidate.priority },
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
