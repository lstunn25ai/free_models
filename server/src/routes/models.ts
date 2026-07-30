import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";

export const modelsRouter = Router();
const ROLES = ["OPUS", "SONNET", "HAIKU", "FABLE", "IMAGE", "VIDEO", "EMBEDDINGS", "DEFAULT"];

function serializePlacement(placement: any) {
  const pm = placement.providerModel;
  const feedback = pm.feedback as Array<{ type: string }>;
  const thumbsUp = feedback.filter((entry) => entry.type === "UP").length;
  const thumbsDown = feedback.filter((entry) => entry.type === "DOWN").length;
  return {
    id: pm.model.id,
    placementId: placement.id,
    name: pm.model.name,
    slug: pm.model.slug,
    category: placement.role,
    stars: placement.stars,
    priority: placement.priority ?? pm.model.priority,
    advantage: pm.model.advantage,
    bestFor: pm.model.bestFor,
    whenToUse: pm.model.whenToUse,
    providerModels: [{
      id: pm.id,
      status: pm.status,
      speedMs: pm.speedMs,
      errorMessage: pm.errorMessage,
      lastChecked: pm.lastChecked?.toISOString() ?? null,
      provider: pm.provider,
      feedbackCount: feedback.length,
      thumbsUp,
      thumbsDown,
    }],
  };
}

async function getPlacements(role?: string) {
  return prisma.modelRolePlacement.findMany({
    where: { ...(role ? { role } : {}), providerModel: { status: "ONLINE" } },
    include: { providerModel: { include: { model: true, provider: { select: { id: true, name: true, slug: true } }, feedback: { select: { type: true } } } } },
    orderBy: [{ role: "asc" }, { stars: "desc" }, { createdAt: "asc" }],
  });
}

modelsRouter.get("/", async (_req: Request, res: Response) => {
  const grouped: Record<string, unknown[]> = {};
  for (const placement of await getPlacements()) {
    if (!grouped[placement.role]) grouped[placement.role] = [];
    grouped[placement.role]!.push(serializePlacement(placement));
  }
  res.json({ categories: grouped });
});

modelsRouter.get("/:category", async (req: Request, res: Response) => {
  const role = req.params.category.toUpperCase();
  if (!ROLES.includes(role)) { res.status(400).json({ error: "Invalid category", validCategories: ROLES }); return; }
  res.json({ models: (await getPlacements(role)).map(serializePlacement) });
});
