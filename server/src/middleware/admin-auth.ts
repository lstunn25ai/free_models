import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.js";
import { getConfig } from "../config/env.js";

const scrypt = promisify(scryptCallback);
const COOKIE_NAME = "free_models_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const SETUP_TTL_MS = 15 * 60_000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
let setupToken: string | undefined;
let setupExpiresAt = 0;

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

function validatePassword(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length < 12 || value.length > 256) return undefined;
  return value;
}

export async function initializeAdminSetup(): Promise<void> {
  const existing = await prisma.adminCredential.findUnique({ where: { id: "owner" } });
  if (existing) return;
  setupToken = randomBytes(32).toString("base64url");
  setupExpiresAt = Date.now() + SETUP_TTL_MS;
  console.info(`[SETUP] Initial admin link (valid for 15 minutes): /admin?setup=${setupToken}`);
  console.info("[SETUP] Do not share this one-time path. It becomes invalid after setup or restart.");
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
    res.json({ authenticated: initialized && await getValidSession(req), initialized, setupRequired: !initialized });
  } catch (error) {
    next(error);
  }
}

export async function setupAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!sameOrigin(req)) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
    const password = validatePassword(req.body?.password);
    const suppliedToken = typeof req.body?.setupToken === "string" ? req.body.setupToken : "";
    if (!password) {
      res.status(400).json({ error: "Password must contain 12 to 256 characters" });
      return;
    }
    if (!setupToken || Date.now() > setupExpiresAt || !safeEqual(suppliedToken, setupToken)) {
      res.status(403).json({ error: "Initial setup link is invalid or expired" });
      return;
    }
    const credential = await prisma.adminCredential.create({
      data: { id: "owner", passwordHash: await hashPassword(password) },
    }).catch((error: { code?: string }) => {
      if (error.code === "P2002") return undefined;
      throw error;
    });
    if (!credential) {
      res.status(409).json({ error: "Administrator is already configured" });
      return;
    }
    setupToken = undefined;
    setupExpiresAt = 0;
    await createSession(res, credential.id);
    res.status(201).end();
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
