import mongoose, { Document, Schema } from "mongoose";

export const ROLES = [
  "Admin",
  "Sales",
  "Sanction",
  "Disbursement",
  "Collection",
  "Borrower",
] as const;
export type Role = (typeof ROLES)[number];

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  createdAt: Date;
}

// User passwords are stored as bcrypt hashes; the plain password never belongs in this model.
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    phone: String,
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>("User", userSchema);
