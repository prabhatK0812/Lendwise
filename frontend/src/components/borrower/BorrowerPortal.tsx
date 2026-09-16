/* ──────────────────────────────────────────────────────────────
 *  BorrowerPortal.tsx — Multi-step loan application workflow
 *
 *  Manages the complete borrower journey: personal details,
 *  BRE eligibility check, salary slip upload, loan configuration,
 *  review, and submission. After submission, shows the My Loans
 *  dashboard with visual status timelines and payment progress.
 * ────────────────────────────────────────────────────────────── */

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API } from "../../lib/api";
import { ApiRequest, BorrowerForm, Loan, User } from "../../types";
import { AppShell } from "../AppShell";
import { StatusTimeline } from "./StatusTimeline";
import { toast } from "../Toast";

const money = (value: number) =>
  `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const statusTone: Record<string, string> = {
  APPLIED: "pending",
  SANCTIONED: "sanctioned",
  DISBURSED: "disbursed",
  CLOSED: "closed",
  REJECTED: "rejected",
};

// BorrowerPortal owns only the borrower journey: profile, BRE, document, configuration, and apply.
export function BorrowerPortal({
  user,
  token,
  onLogout,
  request,
}: {
  user: User;
  token: string;
  onLogout: () => void;
  request: ApiRequest;
}) {
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState("");
  const [eligibility, setEligibility] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState<Loan | null>(null);
  const [myLoans, setMyLoans] = useState<Loan[]>([]);
  const [showMyLoans, setShowMyLoans] = useState(false);
  const [form, setForm] = useState<BorrowerForm>({
    fullName: user.name,
    pan: "",
    dateOfBirth: "",
    monthlySalary: "",
    employmentMode: "Salaried",
    amount: 150000,
    tenureDays: 90,
  });
  // This preview improves UX; the backend recalculates the same formula before persistence.
  const interest = useMemo(
    () => Number(((form.amount * 12 * form.tenureDays) / 36500).toFixed(2)),
    [form.amount, form.tenureDays],
  );

  // Fetch borrower loans on mount; show the My Loans view when at least one exists.
  useEffect(() => {
    request("/loans/mine")
      .then((data) => {
        if (data.loans?.length > 0) {
          setMyLoans(data.loans);
          setShowMyLoans(true);
        }
      })
      .catch(() => { });
  }, [request]);

  function refreshMyLoans() {
    request("/loans/mine")
      .then((data) => {
        setMyLoans(data.loans || []);
        setShowMyLoans(true);
      })
      .catch(() => { });
  }

  async function checkEligibility() {
    setNotice("");
    try {
      const data = await request("/loans/eligibility", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setEligibility(data.errors || []);
      if (data.eligible) {
        setStep(3);
        toast("Eligibility verified! You're good to go.");
      }
    } catch (error) {
      setNotice((error as Error).message);
      toast((error as Error).message, "error");
    }
  }

  async function submitLoan(event?: FormEvent) {
    event?.preventDefault();
    if (!file) return setNotice("Please upload your latest salary slip.");
    setNotice("");
    // FormData is required for the binary salary-slip upload; do not set its Content-Type manually.
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      body.append(key, String(value)),
    );
    body.append("salarySlip", file);
    try {
      const response = await fetch(`${API}/loans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setSubmitted(data.loan);
      setStep(6);
      toast("Application submitted successfully!");
    } catch (error) {
      setNotice((error as Error).message);
      toast((error as Error).message, "error");
    }
  }

  // A borrower cannot apply for a new loan while an active one exists.
  const hasActiveLoan = myLoans.some((loan) =>
    ["APPLIED", "SANCTIONED", "DISBURSED"].includes(loan.status),
  );

  if (showMyLoans) {
    return (
      <AppShell user={user} onLogout={onLogout}>
        <section className="workspace">
          <div className="page-heading">
            <div>
              <p className="kicker">Borrower portal</p>
              <h1>Your loan applications</h1>
              <p className="muted">
                Track the progress of your loans in real time.
              </p>
            </div>
            <button
              className="primary"
              disabled={hasActiveLoan}
              title={
                hasActiveLoan
                  ? "You already have an active loan. Wait until it's closed or rejected."
                  : ""
              }
              onClick={() => {
                if (hasActiveLoan) return;
                setShowMyLoans(false);
                setStep(1);
                setSubmitted(null);
                setFile(null);
                setNotice("");
                setEligibility([]);
                toast("Starting new application", "info");
              }}
            >
              {hasActiveLoan
                ? "Active loan in progress"
                : "New application"}{" "}
              <span>{hasActiveLoan ? "⏳" : "+"}</span>
            </button>
          </div>
          {hasActiveLoan && (
            <div className="alert error" style={{ marginTop: -20, marginBottom: 24 }}>
              You already have an active loan (APPLIED / SANCTIONED / DISBURSED). You can apply for a new loan only after your current loan is <strong>closed</strong> or <strong>rejected</strong>.
            </div>
          )}
          {myLoans.map((loan) => {
            const paid = (loan.payments || []).reduce(
              (sum, p) => sum + p.amount,
              0,
            );
            const progress = loan.totalRepayment
              ? Math.min(
                100,
                Math.round((paid / loan.totalRepayment) * 100),
              )
              : 0;
            return (
              <div className="my-loan-card" key={loan._id}>
                <div className="my-loan-header">
                  <div>
                    <span className="step-label">Loan application</span>
                    <h3>{money(loan.amount)}</h3>
                  </div>
                  <span
                    className={`status ${statusTone[loan.status] || ""}`}
                  >
                    {loan.status}
                  </span>
                </div>
                <div className="my-loan-details">
                  <div>
                    <small>Principal</small>
                    <strong>{money(loan.amount)}</strong>
                  </div>
                  <div>
                    <small>Interest (12% p.a.)</small>
                    <strong>{money(loan.simpleInterest)}</strong>
                  </div>
                  <div>
                    <small>Total repayment</small>
                    <strong>{money(loan.totalRepayment)}</strong>
                  </div>
                  <div>
                    <small>Tenure</small>
                    <strong>{loan.tenureDays} days</strong>
                  </div>
                </div>
                {loan.salarySlip && (
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>📄 Attached Document:</span>
                    <a
                      className="document-link"
                      href={
                        loan.salarySlip.secureUrl && loan.salarySlip.secureUrl.startsWith("http")
                          ? loan.salarySlip.secureUrl
                          : `${API}/loans/${loan._id}/document?token=${encodeURIComponent(token)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {loan.salarySlip.filename || "View uploaded salary slip"} ↗
                    </a>
                  </div>
                )}
                {(loan.status === "DISBURSED" ||
                  loan.status === "CLOSED") && (
                    <div className="payment-progress">
                      <div className="payment-progress-header">
                        <span>Repayment progress</span>
                        <strong>{progress}%</strong>
                      </div>
                      <div className="payment-progress-bar">
                        <div
                          className="payment-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="payment-progress-footer">
                        {money(paid)} of {money(loan.totalRepayment)} paid
                      </div>
                    </div>
                  )}
                <StatusTimeline
                  status={loan.status}
                  rejectionReason={loan.rejectionReason}
                  createdAt={loan.createdAt}
                  updatedAt={loan.updatedAt}
                  disbursedAt={loan.disbursedAt}
                />
              </div>
            );
          })}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} onLogout={onLogout}>
      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="kicker">Borrower portal</p>
            <h1>Let&apos;s shape your next move.</h1>
            <p className="muted">
              A simple, transparent application. You&apos;re in control at every
              step.
            </p>
          </div>
          <div className="secure-chip">
            Secure application <span>●</span>
          </div>
        </div>
        <div className="stepper">
          {["Profile", "Eligibility", "Documents", "Loan config"].map(
            (label, index) => (
              <div
                className={`step ${step >= index + 1 ? "active" : ""}`}
                key={label}
              >
                <span>{index + 1}</span>
                {label}
              </div>
            ),
          )}
        </div>
        <div className="flow-card">
          {step === 1 && (
            <ProfileStep
              form={form}
              setForm={(updated) => {
                setForm(updated);
                setEligibility([]);
                setNotice("");
              }}
              onBack={
                myLoans.length > 0 ? () => setShowMyLoans(true) : undefined
              }
              onNext={() => {
                setEligibility([]);
                setNotice("");
                setStep(2);
              }}
            />
          )}
          {step === 2 && (
            <EligibilityStep
              errors={eligibility}
              notice={notice}
              onBack={() => {
                setEligibility([]);
                setNotice("");
                setStep(1);
              }}
              onNext={checkEligibility}
            />
          )}
          {step === 3 && (
            <DocumentStep
              file={file}
              setFile={setFile}
              notice={notice}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <LoanStep
              form={form}
              setForm={setForm}
              interest={interest}
              notice={notice}
              onBack={() => setStep(3)}
              onReview={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <ReviewStep
              form={form}
              file={file}
              interest={interest}
              onBack={() => setStep(4)}
              onConfirm={() => submitLoan()}
            />
          )}
          {step === 6 && (
            <SuccessStep loan={submitted} onViewLoans={refreshMyLoans} />
          )}
        </div>
      </section>
    </AppShell>
  );
}

function ProfileStep({
  form,
  setForm,
  onBack,
  onNext,
}: {
  form: BorrowerForm;
  setForm: (form: BorrowerForm) => void;
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div className="form-step">
      <div className="step-intro">
        <span className="step-label">01 / Your profile</span>
        <h2>Tell us a little about yourself.</h2>
        <p>These details help us understand your eligibility.</p>
      </div>
      <div className="form-grid">
        <label>
          Full name
          <input
            value={form.fullName}
            onChange={(event) =>
              setForm({ ...form, fullName: event.target.value })
            }
            placeholder="Your full name"
          />
        </label>
        <label>
          PAN number
          <input
            value={form.pan}
            onChange={(event) =>
              setForm({ ...form, pan: event.target.value.toUpperCase() })
            }
            placeholder="ABCDE1234F"
            maxLength={10}
          />
        </label>
        <label>
          Date of birth
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(event) =>
              setForm({ ...form, dateOfBirth: event.target.value })
            }
          />
        </label>
        <label>
          Monthly salary <span className="field-hint">Minimum INR 25,000</span>
          <input
            type="number"
            value={form.monthlySalary}
            onChange={(event) =>
              setForm({ ...form, monthlySalary: event.target.value })
            }
            placeholder="50000"
          />
        </label>
        <label>
          Employment mode
          <select
            value={form.employmentMode}
            onChange={(event) =>
              setForm({ ...form, employmentMode: event.target.value })
            }
          >
            <option>Salaried</option>
            <option>Self-Employed</option>
            <option>Unemployed</option>
          </select>
        </label>
      </div>
      <div className="actions">
        {onBack && (
          <button type="button" className="secondary" onClick={onBack}>
            Back
          </button>
        )}
        <button
          className="primary"
          onClick={onNext}
          disabled={
            !form.fullName ||
            !form.pan ||
            !form.dateOfBirth ||
            !form.monthlySalary
          }
        >
          Continue <span>→</span>
        </button>
      </div>
    </div>
  );
}

function EligibilityStep({
  errors,
  notice,
  onBack,
  onNext,
}: {
  errors: string[];
  notice: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="form-step">
      <div className="step-intro">
        <span className="step-label">02 / Eligibility check</span>
        <h2>Let&apos;s make sure this fits.</h2>
        <p>
          Our business rule engine checks the essentials before you continue.
        </p>
      </div>
      {errors.length > 0 && (
        <div className="alert error">
          <strong>We can&apos;t continue yet.</strong>
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}
      {notice && <div className="alert error">{notice}</div>}
      <div className="rule-list">
        <div>
          <span>Age</span>
          <b>23 to 50 years</b>
        </div>
        <div>
          <span>Monthly income</span>
          <b>INR 25,000 or more</b>
        </div>
        <div>
          <span>PAN identity</span>
          <b>Valid 10-character format</b>
        </div>
        <div>
          <span>Employment</span>
          <b>Salaried or self-employed</b>
        </div>
      </div>
      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button className="primary" onClick={onNext}>
          Run eligibility check <span>→</span>
        </button>
      </div>
    </div>
  );
}

function DocumentStep({
  file,
  setFile,
  notice,
  onBack,
  onNext,
}: {
  file: File | null;
  setFile: (file: File | null) => void;
  notice: string;
  onBack: () => void;
  onNext: () => void;
}) {
  /** Open the uploaded file in a new tab for preview. */
  function previewFile() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
  }

  return (
    <div className="form-step">
      <div className="step-intro">
        <span className="step-label">03 / Verification</span>
        <h2>One last document, then your offer.</h2>
        <p>Upload a recent salary slip so our team can verify your income.</p>
      </div>

      {/* ── Upload zone (shown when no file is selected) ── */}
      {!file && (
        <label className="upload-zone">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => {
              const selected = event.target.files?.[0] || null;
              if (selected && selected.size > 5 * 1024 * 1024) {
                toast("File exceeds 5 MB limit", "error");
                return;
              }
              setFile(selected);
              if (selected) toast(`Uploaded: ${selected.name}`);
            }}
          />
          <span className="upload-icon">↑</span>
          <strong>Drop your salary slip here</strong>
          <small>PDF, JPG or PNG · max 5 MB</small>
        </label>
      )}

      {/* ── File preview card (shown after upload) ── */}
      {file && (
        <div className="uploaded-file-card">
          <div className="uploaded-file-info">
            <span className="uploaded-file-icon">
              {file.type.includes("pdf") ? "📄" : "🖼️"}
            </span>
            <div>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024).toFixed(1)} KB · {file.type.split("/")[1]?.toUpperCase()}</small>
            </div>
          </div>
          <div className="uploaded-file-actions">
            <button type="button" className="ghost small" onClick={previewFile}>
              👁 View
            </button>
            <button
              type="button"
              className="ghost small"
              style={{ color: "#d73a3a" }}
              onClick={() => setFile(null)}
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}

      {notice && <div className="alert error">{notice}</div>}
      <div className="actions">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button className="primary" onClick={onNext} disabled={!file}>
          Continue <span>→</span>
        </button>
      </div>
    </div>
  );
}

function LoanStep({
  form,
  setForm,
  interest,
  notice,
  onBack,
  onReview,
}: {
  form: BorrowerForm;
  setForm: (form: BorrowerForm) => void;
  interest: number;
  notice: string;
  onBack: () => void;
  onReview: () => void;
}) {
  return (
    <div className="form-step">
      <div className="step-intro">
        <span className="step-label">04 / Loan configuration</span>
        <h2>Make it yours.</h2>
        <p>
          Choose an amount and tenure that feels right. Your rate stays fixed at
          12% p.a.
        </p>
      </div>
      <div className="loan-config">
        <label>
          Loan amount <strong>{money(form.amount)}</strong>
          <input
            type="range"
            min="50000"
            max="500000"
            step="5000"
            value={form.amount}
            onChange={(event) =>
              setForm({ ...form, amount: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Tenure <strong>{form.tenureDays} days</strong>
          <input
            type="range"
            min="30"
            max="365"
            value={form.tenureDays}
            onChange={(event) =>
              setForm({ ...form, tenureDays: Number(event.target.value) })
            }
          />
        </label>
        <div className="calculation">
          <div>
            <span>Principal</span>
            <b>{money(form.amount)}</b>
          </div>
          <div>
            <span>Interest · 12% p.a.</span>
            <b>{money(interest)}</b>
          </div>
          <div className="total">
            <span>Total repayment</span>
            <b>{money(form.amount + interest)}</b>
          </div>
        </div>
      </div>
      {notice && <div className="alert error">{notice}</div>}
      <div className="actions">
        <button type="button" className="secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="primary" onClick={onReview}>
          Review application <span>→</span>
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  form,
  file,
  interest,
  onBack,
  onConfirm,
}: {
  form: BorrowerForm;
  file: File | null;
  interest: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  // Review is the final edit boundary. Confirmation sends the immutable application to the server.
  return (
    <div className="form-step review-step">
      <div className="step-intro">
        <span className="step-label">05 / Review before submission</span>
        <h2>Check everything once.</h2>
        <p>
          Review your application carefully before sending it to the sanction
          team.
        </p>
      </div>
      <div className="review-warning">
        <strong>Important:</strong> After confirmation, these details cannot be
        modified from the borrower portal.
      </div>
      <div className="review-grid">
        <ReviewItem label="Full name" value={form.fullName} />
        <ReviewItem label="PAN" value={form.pan} />
        <ReviewItem label="Date of birth" value={form.dateOfBirth} />
        <ReviewItem
          label="Monthly salary"
          value={money(Number(form.monthlySalary))}
        />
        <ReviewItem label="Employment" value={form.employmentMode} />
        <ReviewItem label="Salary slip" value={file?.name || "Not selected"} />
        <ReviewItem label="Loan amount" value={money(form.amount)} />
        <ReviewItem label="Tenure" value={`${form.tenureDays} days`} />
        <ReviewItem label="Interest at 12% p.a." value={money(interest)} />
        <ReviewItem
          label="Total repayment"
          value={money(form.amount + interest)}
        />
      </div>
      <div className="actions">
        <button type="button" className="secondary" onClick={onBack}>
          Edit details
        </button>
        <button type="button" className="primary" onClick={onConfirm}>
          Confirm submission <span>→</span>
        </button>
      </div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function SuccessStep({
  loan,
  onViewLoans,
}: {
  loan: Loan | null;
  onViewLoans: () => void;
}) {
  return (
    <div className="success-step">
      <div className="success-mark">✓</div>
      <span className="step-label">Application received</span>
      <h2>Your request is in motion.</h2>
      <p>
        We&apos;ve received your application. The sanction team will review it
        shortly.
      </p>
      {loan && (
        <>
          <div className="summary-grid">
            <div>
              <small>Requested amount</small>
              <strong>{money(loan.amount)}</strong>
            </div>
            <div>
              <small>Repayment amount</small>
              <strong>{money(loan.totalRepayment)}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong className="status pending">APPLIED</strong>
            </div>
          </div>
          <StatusTimeline 
            status="APPLIED" 
            createdAt={loan.createdAt} 
          />
        </>
      )}
      <div className="success-actions">
        <button className="primary" onClick={onViewLoans}>
          View my loans <span>→</span>
        </button>
      </div>
    </div>
  );
}
