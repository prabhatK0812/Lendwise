/* ──────────────────────────────────────────────────────────────
 *  Loan.ts — Mongoose schema for loan applications
 *
 *  Stores the full loan lifecycle: borrower details, BRE fields,
 *  salary slip metadata, financial math (amount, interest, total),
 *  status enum (APPLIED→SANCTIONED→DISBURSED→CLOSED / REJECTED),
 *  and embedded payment records with UTR numbers.
 * ────────────────────────────────────────────────────────────── */

import mongoose, { Document, Schema } from "mongoose";
import { Role } from "./User";

export type LoanStatus =
  | "APPLIED"
  | "SANCTIONED"
  | "REJECTED"
  | "DISBURSED"
  | "CLOSED";
export interface IPayment {
  utr: string;
  amount: number;
  date: Date;
}
export interface ISalarySlip {
  storage: "cloudinary" | "mongodb";
  secureUrl: string;
  publicId: string;
  filename: string;
  mimeType: string;
  bytes?: number;
  data?: Buffer;
}
export interface ILoan extends Document {
  borrower: mongoose.Types.ObjectId;
  fullName: string;
  pan: string;
  dateOfBirth: Date;
  monthlySalary: number;
  employmentMode: "Salaried" | "Self-Employed" | "Unemployed";
  salarySlip?: ISalarySlip;
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  status: LoanStatus;
  rejectionReason?: string;
  payments: IPayment[];
  disbursedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    utr: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { _id: false },
);

// Loan is the aggregate root for application data, repayment math, lifecycle state, and payments.
const loanSchema = new Schema<ILoan>(
  {
    borrower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    pan: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    monthlySalary: { type: Number, required: true },
    employmentMode: { type: String, required: true },
    salarySlip: {
      storage: { type: String, enum: ["cloudinary", "mongodb"] },
      secureUrl: String,
      publicId: String,
      filename: String,
      mimeType: String,
      bytes: Number,
      data: Buffer,
    },
    amount: { type: Number, required: true },
    tenureDays: { type: Number, required: true },
    interestRate: { type: Number, default: 12 },
    simpleInterest: { type: Number, required: true },
    totalRepayment: { type: Number, required: true },
    status: {
      type: String,
      enum: ["APPLIED", "SANCTIONED", "REJECTED", "DISBURSED", "CLOSED"],
      default: "APPLIED",
    },
    rejectionReason: String,
    payments: { type: [paymentSchema], default: [] },
    disbursedAt: Date,
  },
  { timestamps: true },
);

export const Loan = mongoose.model<ILoan>("Loan", loanSchema);
export type { Role };
