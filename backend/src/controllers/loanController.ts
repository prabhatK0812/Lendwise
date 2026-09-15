import { Response } from "express";
import { AuthRequest } from "../middleware";
import {
  getEligibilityErrors,
  validateLoanTerms,
} from "../validators/loanValidator";
import * as loanService from "../services/loanService";

export function checkEligibility(req: AuthRequest, res: Response) {
  return res.json({
    eligible: getEligibilityErrors(req.body).length === 0,
    errors: getEligibilityErrors(req.body),
  });
}

export async function create(req: AuthRequest, res: Response) {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Salary slip is required" });
    const errors = getEligibilityErrors(req.body);
    if (errors.length)
      return res
        .status(422)
        .json({ message: "Eligibility checks failed", errors });
    const termsError = validateLoanTerms(req.body.amount, req.body.tenureDays);
    if (termsError) return res.status(400).json({ message: termsError });
    const loan = await loanService.createLoan(req.body, req.user!.id, req.file);
    return res
      .status(201)
      .json({ loan: { ...loan.toObject(), salarySlip: undefined } });
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: error.message || "Unable to create loan" });
  }
}

export async function mine(req: AuthRequest, res: Response) {
  return res.json({ loans: await loanService.getBorrowerLoans(req.user!.id) });
}

export async function leads(_req: AuthRequest, res: Response) {
  return res.json({ leads: await loanService.getLeads() });
}

export async function dashboard(req: AuthRequest, res: Response) {
  return res.json({
    role: req.user!.role,
    loans: await loanService.getDashboardLoans(req.user!.role),
  });
}

export async function sanction(req: AuthRequest, res: Response) {
  const loan = await loanService.sanctionLoan(
    String(req.params.id),
    Boolean(req.body.approved),
    req.body.reason,
  );
  if (!loan)
    return res.status(409).json({ message: "Loan is not awaiting sanction" });
  return res.json({ loan });
}

export async function disburse(req: AuthRequest, res: Response) {
  const loan = await loanService.disburseLoan(String(req.params.id));
  if (!loan)
    return res
      .status(409)
      .json({ message: "Only sanctioned loans can be disbursed" });
  return res.json({ loan });
}

export async function payment(req: AuthRequest, res: Response) {
  const { utr, amount, date } = req.body;
  if (!utr || !Number(amount) || Number(amount) <= 0)
    return res
      .status(400)
      .json({ message: "A unique UTR and positive amount are required" });
  const result = await loanService.recordPayment(String(req.params.id), {
    utr,
    amount: Number(amount),
    date,
  });
  if (result.error === "duplicate")
    return res
      .status(409)
      .json({ message: "UTR already exists across payments" });
  if (result.error === "not_found")
    return res.status(404).json({ message: "Active disbursed loan not found" });
  if (result.error === "exceeds_balance")
    return res
      .status(400)
      .json({ message: "Payment exceeds the outstanding balance" });
  return res.status(201).json({ loan: result.loan });
}
