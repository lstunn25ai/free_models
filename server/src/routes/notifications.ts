import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { requireAdmin } from "../middleware/admin-auth.js";

export const notificationsRouter = Router();

/**
 * GET /api/notifications
 * Returns unacknowledged NEW model discoveries, grouped by provider.
 *
 * Auto-archives notifications older than 7 days (sets archivedAt).
 */
notificationsRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  // Auto-archive: mark as archived if discovered > 7 days ago and not acknowledged
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await prisma.newModel.updateMany({
    where: {
      acknowledged: false,
      archivedAt: null,
      discoveredAt: { lt: sevenDaysAgo },
    },
    data: { archivedAt: new Date() },
  });

  // Fetch active (non-archived) new models
  const newModels = await prisma.newModel.findMany({
    where: {
      acknowledged: false,
      archivedAt: null,
    },
    include: {
      provider: { select: { name: true, slug: true } },
    },
    orderBy: { discoveredAt: "desc" },
  });

  // Group by provider for the bell-icon dropdown
  const grouped = newModels.reduce((
    acc: Record<string, { providerName: string; providerSlug: string; models: any[] }>,
    nm: (typeof newModels)[number],
  ) => {
    const providerSlug = nm.provider.slug;
    if (!acc[providerSlug]) {
      acc[providerSlug] = {
        providerName: nm.provider.name,
        providerSlug,
        models: [],
      };
    }
    acc[providerSlug].models.push({
      id: nm.id,
      slug: nm.slug,
      category: nm.category,
      discoveredAt: nm.discoveredAt.toISOString(),
    });
    return acc;
  }, {} as Record<string, { providerName: string; providerSlug: string; models: any[] }>);

  res.json({
    totalNew: newModels.length,
    providers: Object.values(grouped),
  });
});

/**
 * POST /api/notifications/:id/acknowledge
 * Marks a NEW model notification as acknowledged (after the user adds it to the table).
 */
notificationsRouter.post("/:id/acknowledge", requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const updated = await prisma.newModel.update({
    where: { id },
    data: { acknowledged: true },
  });

  res.json({ acknowledged: true, id: updated.id });
});
