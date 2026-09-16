/* ──────────────────────────────────────────────────────────────
 *  types.ts — Shared client-side type contracts
 *
 *  These interfaces mirror the API response shapes used by the
 *  frontend components. Backend validation remains authoritative;
 *  these types improve readability and editor tooling.
 * ────────────────────────────────────────────────────────────── */

// Shared client-side contracts mirror the API response shapes used by the UI.
// Backend validation remains authoritative; these types only improve readability and tooling.
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type Loan = {
  _id: string;
  fullName: string;
  pan?: string;
  dateOfBirth?: string;
  monthlySalary?: number;
  employmentMode?: string;
  amount: number;
  tenureDays: number;
  interestRate?: number;
  totalRepayment: number;
  simpleInterest: number;
  status: string;
  rejectionReason?: string;
  payments?: { amount: number; utr?: string; date?: string }[];
  borrower?: { name: string; email: string };
  salarySlip?: {
    storage: string;
    secureUrl: string;
    filename: string;
    mimeType: string;
    bytes?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  disbursedAt?: string;
};

export type Lead = {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type BorrowerForm = {
  fullName: string;
  pan: string;
  dateOfBirth: string;
  monthlySalary: string;
  employmentMode: string;
  amount: number;
  tenureDays: number;
};

export type ApiRequest = (path: string, options?: RequestInit) => Promise<any>;
