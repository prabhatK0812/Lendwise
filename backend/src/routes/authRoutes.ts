/* ──────────────────────────────────────────────────────────────
 *  authRoutes.ts — /api/auth/* route definitions
 *
 *  POST /signup  → Create a new Borrower account
 *  POST /login   → Authenticate and return a JWT
 *  GET  /me      → Return the current user's identity
 * ────────────────────────────────────────────────────────────── */

import { Router } from "express";
import { authenticate } from "../middleware";
import { login, me, signup } from "../controllers/authController";

const router = Router();
router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, me);
export { router as authRouter };
