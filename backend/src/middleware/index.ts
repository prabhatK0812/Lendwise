import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../models/User";

export interface AuthRequest extends Request {
  user?: { id: string; role: Role; name: string; email: string };
}

// Authentication proves identity; authorization proves access to a business module.
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token)
    return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-secret",
    ) as AuthRequest["user"];
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Role checks stay on the API because frontend visibility alone is not security.
export function authorize(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) =>
    roles.includes(req.user?.role as Role)
      ? next()
      : res
          .status(403)
          .json({ message: "You do not have permission for this module" });
}
