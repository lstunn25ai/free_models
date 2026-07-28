import { Router } from "express";
import { adminSession, loginAdmin, logoutAdmin, requireAdmin, setupAdmin } from "../middleware/admin-auth.js";

export const authRouter = Router();

authRouter.get("/session", adminSession);
authRouter.post("/setup", setupAdmin);
authRouter.post("/login", loginAdmin);
authRouter.post("/logout", requireAdmin, logoutAdmin);
