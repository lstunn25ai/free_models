import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";

export const feedbackRouter = Router();

/**
 * POST /api/feedback
 * Record a 👍 or 👎 for a provider→model link.
 *
 * Body: { providerModelId: string, type: "UP" | "DOWN" }
 *
 * This is the SOURCE OF TRUTH for the Health Circle.
 * The circle is computed from the raw feedback data, not from a cached counter.
 */
feedbackRouter.post("/", async (req: Request, res: Response) => {
  const { providerModelId, type } = req.body;

  if (!providerModelId || !type) {
    res.status(400).json({
      error: "Missing required fields",
      required: ["providerModelId", "type"],
    });
    return;
  }

  if (type !== "UP" && type !== "DOWN") {
    res.status(400).json({
      error: "Invalid type. Must be 'UP' or 'DOWN'.",
    });
    return;
  }

  // Verify the provider model exists
  const providerModel = await prisma.providerModel.findUnique({
    where: { id: providerModelId },
  });

  if (!providerModel) {
    res.status(404).json({ error: "Provider model not found" });
    return;
  }

  // Create feedback entry
  const feedback = await prisma.feedback.create({
    data: {
      providerModelId,
      type: type as any,
    },
  });

  res.status(201).json({ feedback });
});

/**
 * GET /api/feedback/:providerModelId
 * Returns the feedback history for a provider→model link.
 *
 * Used by the frontend tooltip when clicking on the Health Circle.
 */
feedbackRouter.get("/:providerModelId", async (req: Request, res: Response) => {
  const { providerModelId } = req.params;

  const feedbacks = await prisma.feedback.findMany({
    where: { providerModelId },
    orderBy: { createdAt: "desc" },
    take: 100, // Limit to last 100 entries
  });

  const upCount = feedbacks.filter((f: (typeof feedbacks)[number]) => f.type === "UP").length;
  const downCount = feedbacks.filter((f: (typeof feedbacks)[number]) => f.type === "DOWN").length;

  res.json({
    total: feedbacks.length,
    up: upCount,
    down: downCount,
    healthCircle: computeHealthCircle(upCount, downCount),
    feedbacks: feedbacks.map((f: (typeof feedbacks)[number]) => ({
      type: f.type,
      createdAt: f.createdAt.toISOString(),
    })),
  });
});

/**
 * Compute the Health Circle fill percentage.
 *
 * Formula: (up - down) * 20%
 * Range: -100% (full red) to +100% (full green)
 * Cap: 5 votes = 100% max
 */
export function computeHealthCircle(up: number, down: number): number {
  const net = up - down;
  const raw = net * 20;
  return Math.max(-100, Math.min(100, raw));
}
