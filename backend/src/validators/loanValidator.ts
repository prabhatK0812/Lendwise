const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function ageFrom(date: string) {
  const dob = new Date(date);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
  return age;
}

// BRE rules are centralized so eligibility preview and loan creation use the same policy.
export function getEligibilityErrors(data: {
  dateOfBirth: string;
  monthlySalary: string | number;
  pan: string;
  employmentMode: string;
}) {
  const age = ageFrom(data.dateOfBirth);
  return [
    ...(age < 23 || age > 50
      ? ["Applicant age must be between 23 and 50 years"]
      : []),
    ...(Number(data.monthlySalary) < 25000
      ? ["Monthly salary must be at least INR 25,000"]
      : []),
    ...(!PAN_REGEX.test(String(data.pan).toUpperCase())
      ? ["PAN must follow the valid format, e.g. ABCDE1234F"]
      : []),
    ...(data.employmentMode === "Unemployed"
      ? ["Unemployed applicants are not eligible"]
      : []),
  ];
}

export function validateLoanTerms(
  amount: string | number,
  tenureDays: string | number,
) {
  const principal = Number(amount);
  const days = Number(tenureDays);
  if (principal < 50000 || principal > 500000 || days < 30 || days > 365) {
    return "Loan amount or tenure is outside the allowed range";
  }
  return null;
}

export function calculateLoanMath(amount: number, tenureDays: number) {
  const simpleInterest = Number(
    ((amount * 12 * tenureDays) / (365 * 100)).toFixed(2),
  );
  return { simpleInterest, totalRepayment: amount + simpleInterest };
}
