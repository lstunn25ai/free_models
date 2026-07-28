import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client for the entire application.
 *
 * Why singleton:
 * - Each `new PrismaClient()` creates a new connection pool
 * - In development with hot-reload (tsx watch), we'd leak connections
 * - Prisma's own docs recommend a single instance per process
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "warn", "error"]
    : ["warn", "error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}