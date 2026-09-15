import { Router } from "express";
import { authenticate } from "../middleware";
import { login, me, signup } from "../controllers/authController";

const router = Router();
router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, me);
export { router as authRouter };
