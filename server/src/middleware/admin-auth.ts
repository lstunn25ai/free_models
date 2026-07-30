import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";
import { getConfig } from "../config/env.js";
import { ADMIN_USERNAME, validateAdminPassword } from "../config/password-policy.js";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "free_models_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  return raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derived.toString("base64url")}`;
}

async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [salt, stored] = passwordHash.split(":");
  if (!salt || !stored) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  return safeEqual(derived.toString("base64url"), stored);
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const config = getConfig();
    if (config.NODE_ENV === "development") {
      return ["http://localhost:5173", "http://localhost:3000"].includes(origin);
    }
    return new URL(origin).host === req.get("host");
  } catch {
    return false;
  }
}

function setSessionCookie(res: Response, token: string): void {
  const config = getConfig();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

async function createSession(res: Response, credentialId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.adminSession.create({
    data: {
      tokenHash: hashToken(token),
      credentialId,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    },
  });
  setSessionCookie(res, token);
}

async function getValidSession(req: Request): Promise<boolean> {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return false;
  if (session.expiresAt <= new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    return false;
  }
  return true;
}

export async function initializeAdminFromEnv(): Promise<void> {
  const existing = await prisma.adminCredential.findUnique({ where: { id: "owner" } });
  if (existing) return;
  const password = validateAdminPassword(getConfig().ADMIN_PASSWORD);
  if (!password) {
    throw new Error("ADMIN_PASSWORD must contain 12 to 256 characters before the first start");
  }
  await prisma.adminCredential.create({
    data: { id: "owner", passwordHash: await hashPassword(password) },
  }).catch((error: { code?: string }) => {
    if (error.code !== "P2002") throw error;
  });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
    if (!await getValidSession(req)) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export async function adminSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const initialized = Boolean(await prisma.adminCredential.findUnique({ where: { id: "owner" } }));
    res.json({ authenticated: initialized && await getValidSession(req), initialized, setupRequired: false, username: ADMIN_USERNAME });
  } catch (error) {
    next(error);
  }
}

export async function changeAdminPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const nextPassword = validateAdminPassword(req.body?.newPassword);
    const credential = await prisma.adminCredential.findUnique({ where: { id: "owner" } });
    if (!credential || !await verifyPassword(currentPassword, credential.passwordHash)) {
      res.status(401).json({ error: "Current password is invalid" });
      return;
    }
    if (!nextPassword) {
      res.status(400).json({ error: "New password must contain 12 to 256 characters" });
      return;
    }
    await prisma.adminCredential.update({ where: { id: credential.id }, data: { passwordHash: await hashPassword(nextPassword) } });
    await prisma.adminSession.deleteMany({ where: { credentialId: credential.id } });
    await createSession(res, credential.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function loginAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
    const client = req.ip || "unknown";
    const now = Date.now();
    const attempt = loginAttempts.get(client);
    if (attempt && attempt.resetAt > now && attempt.count >= 5) {
      res.status(429).json({ error: "Too many login attempts. Try again later." });
      return;
    }
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const credential = await prisma.adminCredential.findUnique({ where: { id: "owner" } });
    if (!credential || !await verifyPassword(password, credential.passwordHash)) {
      loginAttempts.set(client, { count: (attempt?.resetAt ?? 0) > now ? (attempt?.count ?? 0) + 1 : 1, resetAt: now + 15 * 60_000 });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    loginAttempts.delete(client);
    await createSession(res, credential.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function logoutAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readCookie(req, COOKIE_NAME);
    if (token) await prisma.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: getConfig().NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
