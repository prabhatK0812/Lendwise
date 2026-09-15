import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models";

export function tokenFor(user: any) {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "1d" },
  );
}

export async function createBorrower(
  name: string,
  email: string,
  password: string,
) {
  const exists = await User.findOne({ email });
  if (exists) return null;
  const user = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "Borrower",
  });
  return {
    token: tokenFor(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password || "", user.password)))
    return null;
  return {
    token: tokenFor(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
}
