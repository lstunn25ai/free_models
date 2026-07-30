import { prisma } from "../config/database.js";

/** Preserve existing catalogue rows when upgrading from single-category models. */
export async function backfillLegacyPlacements(): Promise<void> {
  const links = await prisma.providerModel.findMany({ include: { model: true } });
  for (const link of links) {
    await prisma.modelRolePlacement.upsert({
      where: { providerModelId_role: { providerModelId: link.id, role: link.model.category } },
      update: {},
      create: { providerModelId: link.id, role: link.model.category, stars: Math.max(3, Math.min(5, link.model.stars)), priority: link.model.priority },
    });
  }
}
