import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { getConfig } from "./config/env.js";
import { prisma } from "./config/database.js";
import { modelsRouter } from "./routes/models.js";
import { providersRouter } from "./routes/providers.js";
import { feedbackRouter } from "./routes/feedback.js";
import { refreshRouter } from "./routes/refresh.js";
import { notificationsRouter } from "./routes/notifications.js";

export function createApp(): Express {
  const config = getConfig();
  const app: Express = express();

  // ─── Security Middleware ───────────────────────────────────────────
  app.use(helmet(
    config.NODE_ENV === "development"
      ? { contentSecurityPolicy: false }
      : {}
  ));
  app.use(cors({
    origin: config.NODE_ENV === "development"
      ? ["http://localhost:5173", "http://localhost:3000"]
      : true, // In production, same-origin through nginx
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  // ─── Body Parsing ──────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" })); // 1MB limit — enough for feedback payloads
  app.use(express.urlencoded({ extended: false }));

  // ─── Logging ───────────────────────────────────────────────────────
  if (config.NODE_ENV === "development") {
    app.use(morgan("dev"));
  } else {
    app.use(morgan("combined"));
  }

  // ─── API Routes ────────────────────────────────────────────────────
  app.use("/api/models", modelsRouter);
  app.use("/api/providers", providersRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/refresh", refreshRouter);
  app.use("/api/notifications", notificationsRouter);

  // ─── Health Check ──────────────────────────────────────────────────
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      // Verify database connection is alive
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({
        status: "error",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ─── Static Files (Frontend) ───────────────────────────────────────
  const staticDir = path.resolve(process.cwd(), "../client/dist");
  app.use(express.static(staticDir));

  // SPA fallback: for any non-API request, serve index.html
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });

  // ─── Global Error Handler ──────────────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[ERROR]", err);

    // Prisma known errors
    if (err.constructor?.name === "PrismaClientKnownRequestError") {
      const prismaErr = err as any;
      // P2002 = unique constraint violation
      if (prismaErr.code === "P2002") {
        res.status(409).json({
          error: "Conflict",
          message: "A record with this value already exists.",
        });
        return;
      }
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: config.NODE_ENV === "development" ? err.message : "Something went wrong",
    });
  });

  return app;
}