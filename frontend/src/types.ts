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
  amount: number;
  tenureDays: number;
  totalRepayment: number;
  simpleInterest: number;
  status: string;
  rejectionReason?: string;
  payments?: { amount: number }[];
  borrower?: { name: string; email: string };
  salarySlip?: {
    storage: string;
    secureUrl: string;
    filename: string;
    mimeType: string;
  };
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
