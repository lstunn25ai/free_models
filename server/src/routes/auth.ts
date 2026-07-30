import { Router } from "express";
import { adminSession, changeAdminPassword, loginAdmin, logoutAdmin, requireAdmin } from "../middleware/admin-auth.js";

export const authRouter = Router();

authRouter.get("/session", adminSession);
authRouter.post("/login", loginAdmin);
authRouter.post("/logout", requireAdmin, logoutAdmin);
authRouter.post("/password", requireAdmin, changeAdminPassword);
