import { Router, type Request, type Response } from "express";
import { lookup } from "node:dns/promises";
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

function roleMatchesFor(slug: string, name: string, category?: string) {
  const primary = roleFor(slug, name, category);
  const value = `${slug} ${name}`.toLowerCase();
  const matches: Array<{ role: string; stars: number; reason: string }> = [];
  const add = (role: string, stars: number, reason: string) => {
    if (stars >= 3 && !matches.some((match) => match.role === role)) matches.push({ role, stars, reason });
  };
  if (primary.score >= 60) add(primary.role, Math.min(5, Math.round(primary.score / 20)), primary.reason);
  const knownTopTier = /(deepseek.*(v4.*pro|r1)|glm[- ]?5(\.|-|$)|kimi[- ]?k(2\.5|26|3)|qwen3.*(235b|coder)|gemma[- ]?3.*27b|nemotron.*(super|ultra))/.test(value);
  if (knownTopTier) {
    add("OPUS", 5, "Known high-capability family; require successful task benchmark before approval.");
    add("FABLE", 5, "Known high-capability family; require successful task benchmark before approval.");
  } else {
    if (/(reason|think|coder|code|ultra)/.test(value)) add("OPUS", 4, "Reasoning or coding signal; benchmark confirmation required.");
    if (/(reason|think|creative|write|story)/.test(value)) add("FABLE", 4, "Long-form or reasoning signal; benchmark confirmation required.");
  }
  if (/(code|coder|general|chat)/.test(value)) add("SONNET", 3, "General coding or chat signal.");
  if (/(vision|image|vl|visual)/.test(value)) add("IMAGE", 3, "Vision capability signal.");
  return matches.sort((left, right) => right.stars - left.stars || left.role.localeCompare(right.role));
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
    roleMatches: roleMatchesFor(candidate.slug, candidate.name, candidate.categorySuggestion ?? undefined),
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

function isPrivateAddress(address: string): boolean {
  return /^(127\\.|0\\.|10\\.|192\\.168\\.|169\\.254\\.|172\\.(1[6-9]|2\\d|3[01])\\.|::1$|fc|fd|fe80:)/i.test(address);
}

async function safeCustomBaseUrl(raw: unknown): Promise<URL | undefined> {
  if (typeof raw !== "string" || raw.length > 300) return undefined;
  try {
    const url = new URL(raw);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || /^(localhost|127\\.|0\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)/.test(url.hostname)) return undefined;
    const resolved = await lookup(url.hostname, { all: true, verbatim: true });
    if (!resolved.length || resolved.some((entry) => isPrivateAddress(entry.address))) return undefined;
    return url;
  } catch { return undefined; }
}

async function customFetch(url: URL, key: string, path: string, init?: RequestInit): Promise<globalThis.Response> {
  const target = new URL(path, url.href.endsWith("/") ? url.href : `${url.href}/`);
  return fetch(target, { ...init, signal: AbortSignal.timeout(12_000), headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) } });
}

// Session-only OpenAI-compatible custom API discovery. The key is accepted for this request only.
adminRouter.post("/custom/discover", async (req: Request, res: Response) => {
  const baseUrl = await safeCustomBaseUrl(req.body?.baseUrl);
  const apiKey = typeof req.body?.apiKey === "string" && req.body.apiKey.length <= 4096 ? req.body.apiKey : "";
  if (!baseUrl || !apiKey) { res.status(400).json({ error: "A valid public base URL and API key are required" }); return; }
  try {
    const response = await customFetch(baseUrl, apiKey, "models");
    if (!response.ok) { res.status(502).json({ error: "Custom provider rejected model discovery" }); return; }
    const body = await response.json() as { data?: Array<{ id?: string; name?: string }> };
    const models = (body.data ?? []).flatMap((item) => typeof item.id === "string" && item.id.length <= 200 ? [{ slug: item.id, name: typeof item.name === "string" ? item.name : item.id, roleMatches: roleMatchesFor(item.id, item.name ?? item.id) }] : []);
    res.json({ models });
  } catch { res.status(502).json({ error: "Custom provider is unavailable" }); }
});

adminRouter.post("/custom/test", async (req: Request, res: Response) => {
  const baseUrl = await safeCustomBaseUrl(req.body?.baseUrl);
  const apiKey = typeof req.body?.apiKey === "string" && req.body.apiKey.length <= 4096 ? req.body.apiKey : "";
  const model = typeof req.body?.model === "string" && req.body.model.length <= 200 ? req.body.model : "";
  if (!baseUrl || !apiKey || !model) { res.status(400).json({ error: "A valid base URL, API key and model are required" }); return; }
  const startedAt = Date.now();
  try {
    const response = await customFetch(baseUrl, apiKey, "chat/completions", { method: "POST", body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with OK." }], max_tokens: 4, temperature: 0 }) });
    if (!response.ok) { res.status(502).json({ status: "OFFLINE", error: "Custom model did not accept the test" }); return; }
    res.json({ status: "ONLINE", speedMs: Date.now() - startedAt });
  } catch { res.status(502).json({ status: "OFFLINE", error: "Custom model is unavailable" }); }
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
  const providerSlug = typeof req.body?.provider === "string" ? req.body.provider : undefined;
  const candidates = await prisma.candidateModel.findMany({
    where: { reviewStatus: "DISCOVERED", hidden: false, quotaStatus: { in: ["FREE", "LIMITED"] }, ...(providerSlug ? { provider: { slug: providerSlug } } : {}) },
    include: { provider: { select: { id: true, name: true, slug: true } } },
    take: 100,
    orderBy: { updatedAt: "asc" },
  });
  const results: Array<{ id: string; status: string; speedMs?: number | null; error?: string | null }> = [];
  let cursor = 0;
  const runOne = async (candidate: typeof candidates[number]) => {
    const adapter = getProviderAdapter(candidate.provider.slug);
    if (!adapter) {
      results.push({ id: candidate.id, status: "OFFLINE", error: "Provider is not configured" });
      return;
    }
    const result = await adapter.healthCheck(candidate.slug);
    await prisma.candidateModel.update({ where: { id: candidate.id }, data: { testStatus: result.status, speedMs: result.speedMs, errorMessage: result.errorMessage, lastChecked: new Date() } });
    results.push({ id: candidate.id, status: result.status, speedMs: result.speedMs, error: result.errorMessage });
  };
  await Promise.all(Array.from({ length: Math.min(3, candidates.length) }, async () => {
    while (cursor < candidates.length) {
      const candidate = candidates[cursor++];
      if (candidate) await runOne(candidate);
    }
  }));
  res.json({ provider: providerSlug ?? null, totalChecked: results.length, results });
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
  const rawPlacements: Array<{ role?: unknown; stars?: unknown }> = Array.isArray(req.body?.placements) ? req.body.placements : [{ role: req.body?.category, stars: req.body?.stars }];
  const placements = rawPlacements.flatMap((placement) => {
    const role = typeof placement?.role === "string" ? placement.role.toUpperCase() : "";
    const stars = typeof placement?.stars === "number" ? placement.stars : 0;
    return CATEGORIES.includes(role as (typeof CATEGORIES)[number]) && Number.isFinite(stars) && stars >= 3 && stars <= 5 ? [{ role, stars }] : [];
  });
  if (!placements.length || placements.length !== rawPlacements.length || new Set(placements.map((placement) => placement.role)).size !== placements.length) {
    res.status(400).json({ error: "At least one unique role with 3 to 5 stars is required" });
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
    const primary = placements[0]!;
    const model = await tx.model.upsert({
      where: { slug: candidate.slug },
      update: { name: candidate.name, category: primary.role, stars: primary.stars, priority: candidate.priority },
      create: { name: candidate.name, slug: candidate.slug, category: primary.role, stars: primary.stars, priority: candidate.priority },
    });
    const providerModel = await tx.providerModel.upsert({
      where: { modelId_providerId: { modelId: model.id, providerId: candidate.providerId } },
      update: { status: "ONLINE", speedMs: candidate.speedMs, errorMessage: null, lastChecked: candidate.lastChecked },
      create: { modelId: model.id, providerId: candidate.providerId, status: "ONLINE", speedMs: candidate.speedMs, lastChecked: candidate.lastChecked },
    });
    for (const placement of placements) {
      await tx.modelRolePlacement.upsert({ where: { providerModelId_role: { providerModelId: providerModel.id, role: placement.role } }, update: { stars: placement.stars, priority: candidate.priority }, create: { providerModelId: providerModel.id, role: placement.role, stars: placement.stars, priority: candidate.priority } });
    }
    await tx.candidateModel.update({ where: { id: candidate.id }, data: { reviewStatus: "APPROVED" } });
    return model;
  });
  res.status(201).json({ model: result, placements });
});

adminRouter.delete("/placements/:id", async (req: Request, res: Response) => {
  const placement = await prisma.modelRolePlacement.findUnique({ where: { id: req.params.id } });
  if (!placement) { res.status(404).json({ error: "Placement not found" }); return; }
  await prisma.modelRolePlacement.delete({ where: { id: placement.id } });
  res.status(204).end();
});

adminRouter.post("/candidates/:id/reject", async (req: Request, res: Response) => {
  await prisma.candidateModel.update({ where: { id: req.params.id }, data: { reviewStatus: "REJECTED" } });
  res.status(204).end();
});
