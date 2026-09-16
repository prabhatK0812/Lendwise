/* ──────────────────────────────────────────────────────────────
 *  authController.ts — Authentication HTTP handlers
 *
 *  Thin request/response layer that delegates business logic
 *  to authService. Exposes signup, login, and identity (me)
 *  endpoints. Signup is restricted to the Borrower role.
 * ────────────────────────────────────────────────────────────── */

import { Request, Response } from "express";
import { createBorrower, loginUser } from "../services/authService";
import { AuthRequest } from "../middleware";

// Controllers translate HTTP input into service calls and map outcomes to status codes.
export async function signup(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    const result = await createBorrower(name, email, password);
    if (!result)
      return res.status(409).json({ message: "Email already registered" });
    return res.status(201).json(result);
  } catch {
    return res.status(500).json({ message: "Unable to create account" });
  }
}

export async function login(req: Request, res: Response) {
  const result = await loginUser(req.body.email, req.body.password);
  if (!result)
    return res.status(401).json({ message: "Invalid email or password" });
  return res.json(result);
}

export function me(req: AuthRequest, res: Response) {
  return res.json({ user: req.user });
}
