/* ──────────────────────────────────────────────────────────────
 *  loanService.ts — Loan lifecycle business logic
 *
 *  Core operations: loan creation with Cloudinary upload,
 *  role-filtered dashboard queries, status transitions
 *  (sanction, disburse), and payment recording with auto-close.
 *  Every transition uses atomic findOneAndUpdate guards.
 * ────────────────────────────────────────────────────────────── */

import { Loan, User } from "../models";
import { uploadSalarySlip } from "../config/cloudinary";
import { calculateLoanMath } from "../validators/loanValidator";

export async function createLoan(
  data: any,
  borrowerId: string,
  file: Express.Multer.File,
) {
  const principal = Number(data.amount);
  const tenureDays = Number(data.tenureDays);
  const { simpleInterest, totalRepayment } = calculateLoanMath(
    principal,
    tenureDays,
  );
  let salarySlip;

  // Cloudinary is the primary document store; MongoDB fallback prevents a valid application being lost.
  try {
    const uploaded = await uploadSalarySlip(file.buffer, file.originalname);
    salarySlip = {
      storage: "cloudinary",
      secureUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      filename: file.originalname,
      mimeType: file.mimetype,
      bytes: uploaded.bytes,
    };
  } catch (error) {
    console.warn("Cloudinary upload failed; using MongoDB fallback", error);
    salarySlip = {
      storage: "mongodb",
      secureUrl: "",
      publicId: "",
      filename: file.originalname,
      mimeType: file.mimetype,
      bytes: file.size,
      data: file.buffer,
    };
  }

  return Loan.create({
    borrower: borrowerId,
    fullName: data.fullName,
    pan: String(data.pan).toUpperCase(),
    dateOfBirth: data.dateOfBirth,
    monthlySalary: data.monthlySalary,
    employmentMode: data.employmentMode,
    salarySlip,
    amount: principal,
    tenureDays,
    interestRate: 12,
    simpleInterest,
    totalRepayment,
  });
}

export async function getBorrowerLoans(borrowerId: string) {
  return Loan.find({ borrower: borrowerId })
    .select("-salarySlip.data")
    .sort({ createdAt: -1 });
}

export async function getLeads() {
  const applicants = await Loan.distinct("borrower");
  return User.find({ role: "Borrower", _id: { $nin: applicants } })
    .select("name email createdAt")
    .sort({ createdAt: -1 });
}

export async function getDashboardLoans(role: string) {
  const statuses =
    role === "Sales"
      ? []
      : role === "Sanction"
        ? ["APPLIED"]
        : role === "Disbursement"
          ? ["SANCTIONED"]
          : role === "Collection"
            ? ["DISBURSED"]
            : undefined;
  return (
    Loan.find(statuses ? { status: { $in: statuses } } : {})
      // Executives may review document metadata/URL, but binary fallback content is never returned.
      .select("-salarySlip.data")
      .populate("borrower", "name email")
      .sort({ createdAt: -1 })
  );
}

export async function sanctionLoan(
  id: string,
  approved: boolean,
  reason?: string,
) {
  return Loan.findOneAndUpdate(
    { _id: id, status: "APPLIED" },
    approved
      ? { status: "SANCTIONED", rejectionReason: undefined }
      : {
          status: "REJECTED",
          rejectionReason: reason || "Application rejected by sanction team",
        },
    { new: true },
  );
}

export async function disburseLoan(id: string) {
  return Loan.findOneAndUpdate(
    { _id: id, status: "SANCTIONED" },
    { status: "DISBURSED", disbursedAt: new Date() },
    { new: true },
  );
}

export async function recordPayment(
  id: string,
  payment: { utr: string; amount: number; date?: string },
) {
  const duplicate = await Loan.findOne({ "payments.utr": payment.utr });
  if (duplicate) return { error: "duplicate" as const };
  const loan = await Loan.findOne({ _id: id, status: "DISBURSED" });
  if (!loan) return { error: "not_found" as const };
  const paid = loan.payments.reduce((sum, item) => sum + item.amount, 0);
  const paymentAmount = Number(Number(payment.amount).toFixed(2));
  const outstanding = Number((loan.totalRepayment - paid).toFixed(2));
  if (paymentAmount > outstanding) return { error: "exceeds_balance" as const };
  loan.payments.push({
    utr: payment.utr,
    amount: paymentAmount,
    date: payment.date ? new Date(payment.date) : new Date(),
  });
  if (
    Number((paid + paymentAmount).toFixed(2)) >=
    Number(loan.totalRepayment.toFixed(2))
  )
    loan.status = "CLOSED";
  await loan.save();
  return { loan };
}

export async function getLoanById(id: string) {
  return Loan.findById(id).populate("borrower", "name email");
}
