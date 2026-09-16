/* ──────────────────────────────────────────────────────────────
 *  OperationsDashboard.tsx — Internal loan operations panel
 *
 *  Four role-based modules: Sales (leads), Sanction (approve/
 *  reject), Disbursement (fund release), Collection (payments).
 *  Admin users can switch between all modules. Each action
 *  triggers a toast notification for instant visual feedback.
 * ────────────────────────────────────────────────────────────── */

"use client";

import { FormEvent, useEffect, useState } from "react";
import { API, readSession } from "../../lib/api";
import { ApiRequest, Lead, Loan, User } from "../../types";
import { AppShell } from "../AppShell";
import { toast } from "../Toast";
import { LoanDetailModal } from "./LoanDetailModal";

const money = (value: number) =>
  `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const preciseMoney = (value: number) =>
  `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusTone: Record<string, string> = {
  APPLIED: "pending",
  SANCTIONED: "sanctioned",
  DISBURSED: "disbursed",
  CLOSED: "closed",
  REJECTED: "rejected",
};

// OperationsDashboard renders role-filtered queues and sends lifecycle commands to the protected API.
export function OperationsDashboard({
  user,
  onLogout,
  request,
}: {
  user: User;
  onLogout: () => void;
  request: ApiRequest;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [rejectionLoanId, setRejectionLoanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");
  const [selectedLoanForReview, setSelectedLoanForReview] = useState<Loan | null>(null);
  const sessionToken = readSession()?.token || "";

  useEffect(() => {
    request("/loans/dashboard")
      .then((data) => setLoans(data.loans))
      .catch((error) => setNotice(error.message));
    if (user.role === "Admin" || user.role === "Sales")
      request("/loans/leads")
        .then((data) => setLeads(data.leads))
        .catch((error) => setNotice(error.message));
  }, [refresh, request, user.role]);

  const isAdmin = user.role === "Admin";
  const activeModule = isAdmin ? selectedModule : user.role.toUpperCase();
  const visibleLoans = loans.filter((loan) => {
    if (activeModule === "ALL") return true;
    const statusByModule: Record<string, string> = {
      SANCTION: "APPLIED",
      DISBURSEMENT: "SANCTIONED",
      COLLECTION: "DISBURSED",
    };
    return loan.status === statusByModule[activeModule];
  });
  const counts = loans.reduce<Record<string, number>>((summary, loan) => {
    summary[loan.status] = (summary[loan.status] || 0) + 1;
    return summary;
  }, {});
  const moduleCopy: Record<
    string,
    { label: string; detail: string; icon: string }
  > = {
    SALES: { label: "Sales", detail: "New borrower leads", icon: "01" },
    SANCTION: { label: "Sanction", detail: "Review applied loans", icon: "02" },
    DISBURSEMENT: {
      label: "Disbursement",
      detail: "Release approved funds",
      icon: "03",
    },
    COLLECTION: { label: "Collection", detail: "Track repayments", icon: "04" },
  };
  /** Execute a lifecycle transition and show a toast notification. */
  async function action(path: string, body?: unknown, successMessage?: string) {
    try {
      await request(path, {
        method: path.includes("/payments") ? "POST" : "PATCH",
        body: JSON.stringify(body || { approved: true }),
      });
      if (successMessage) toast(successMessage);
      setRefresh((value) => value + 1);
    } catch (error) {
      setNotice((error as Error).message);
      toast((error as Error).message, "error");
      // Refresh after a conflict because another executive may have already acted.
      setRefresh((value) => value + 1);
    }
  }

  return (
    <AppShell user={user} onLogout={onLogout} eyebrow="Operations dashboard">
      <section className="workspace ops">
        <div className="page-heading">
          <div>
            <p className="kicker">Internal operations</p>
            <h1>{isAdmin ? "Operations overview" : `${user.role} queue`}</h1>
            <p className="muted">
              A focused view of the loans that need your team next.
            </p>
          </div>
          <div className="role-badge">
            {user.role}
            <span> access</span>
          </div>
        </div>
        <div
          className="module-strip"
          style={!isAdmin ? { display: "flex", gap: 12, marginBottom: 24 } : undefined}
        >
          {["SALES", "SANCTION", "DISBURSEMENT", "COLLECTION"]
            .filter((item) => isAdmin || item === activeModule)
            .map((item) => {
              const copy = moduleCopy[item];
              const isActive =
                activeModule === item || (isAdmin && selectedModule === "ALL");
              return (
                <button
                  type="button"
                  className={isActive ? "module active" : "module"}
                  style={!isAdmin ? { maxWidth: 260, cursor: "default" } : undefined}
                  key={item}
                  onClick={() => isAdmin && setSelectedModule(item)}
                >
                  <span className="module-number">{copy.icon}</span>
                  <span className="module-content">
                    <strong>{copy.label}</strong>
                    <small>{copy.detail}</small>
                  </span>
                  {isAdmin && <span className="module-arrow">↗</span>}
                </button>
              );
            })}
        </div>
        {isAdmin && (
          <button
            type="button"
            className={`portfolio-filter ${selectedModule === "ALL" ? "selected" : ""}`}
            onClick={() => setSelectedModule("ALL")}
          >
            View all portfolio
          </button>
        )}
        {notice && <div className="alert error">{notice}</div>}
        {isAdmin && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 32,
            }}
          >
            <MetricCard
              label="Applied"
              value={counts.APPLIED || 0}
              tone="blue"
            />
            <MetricCard
              label="Sanctioned"
              value={counts.SANCTIONED || 0}
              tone="orange"
            />
            <MetricCard
              label="Disbursed"
              value={counts.DISBURSED || 0}
              tone="purple"
            />
            <MetricCard
              label="Closed"
              value={counts.CLOSED || 0}
              tone="green"
            />
          </div>
        )}
        <div className="table-card">
          <div className="table-head">
            <div>
              <span className="step-label">Live queue</span>
              <h2>
                {activeModule === "SALES" ? leads.length : visibleLoans.length}{" "}
                {isAdmin
                  ? "loans in portfolio"
                  : activeModule === "SALES"
                    ? leads.length === 1
                      ? "lead needs attention"
                      : "leads need attention"
                    : visibleLoans.length === 1
                      ? "loan needs attention"
                      : "loans need attention"}
              </h2>
              <p className="table-subtitle">
                Prioritized work for the {user.role.toLowerCase()} team
              </p>
            </div>
            <span className="live">
              <i /> Synced just now
            </span>
          </div>
          {activeModule === "SALES" ? (
            <LeadList leads={leads} />
          ) : visibleLoans.length === 0 ? (
            <EmptyQueue />
          ) : (
            <LoanList
              loans={visibleLoans}
              user={user}
              sessionToken={sessionToken}
              onSelectLoan={(loan) => setSelectedLoanForReview(loan)}
              onApprove={(id) => action(`/loans/${id}/sanction`, undefined, "Loan approved successfully")}
              onReject={(id) => setRejectionLoanId(id)}
              onDisburse={(id) => action(`/loans/${id}/disburse`, undefined, "Funds released successfully")}
              onPayment={(id, payment) =>
                action(`/loans/${id}/payments`, payment, "Payment recorded successfully")
              }
            />
          )}
        </div>
        {selectedLoanForReview && (
          <LoanDetailModal
            loan={selectedLoanForReview}
            user={user}
            sessionToken={sessionToken}
            onClose={() => setSelectedLoanForReview(null)}
            onApprove={(id) => {
              action(`/loans/${id}/sanction`, undefined, "Loan approved & sanctioned successfully");
              setSelectedLoanForReview(null);
            }}
            onReject={(id, reason) => {
              action(
                `/loans/${id}/sanction`,
                { approved: false, reason },
                "Application rejected",
              );
              setSelectedLoanForReview(null);
            }}
          />
        )}
        {rejectionLoanId && (
          <RejectionModal
            reason={rejectionReason}
            setReason={setRejectionReason}
            onCancel={() => {
              setRejectionLoanId(null);
              setRejectionReason("");
            }}
            onSubmit={() => {
              if (!rejectionReason.trim()) return;
              action(`/loans/${rejectionLoanId}/sanction`, {
                approved: false,
                reason: rejectionReason.trim(),
              }, "Application rejected");
              setRejectionLoanId(null);
              setRejectionReason("");
            }}
          />
        )}
      </section>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className={`ops-metric metric-${tone}`}>
      <span className="metric-dot" />
      <div>
        <small>{label}</small>
        <strong>{value.toString().padStart(2, "0")}</strong>
      </div>
    </div>
  );
}

function LeadList({ leads }: { leads: Lead[] }) {
  return leads.length === 0 ? (
    <EmptyQueue
      title="No new leads"
      detail="Newly registered borrowers will appear here before they apply."
    />
  ) : (
    <div className="loan-list">
      {leads.map((lead) => (
        <div className="loan-row" key={lead._id}>
          <div className="loan-avatar">{lead.name.slice(0, 1)}</div>
          <div className="loan-person">
            <strong>{lead.name}</strong>
            <small>{lead.email}</small>
          </div>
          <div>
            <small>Registered</small>
            <strong>{new Date(lead.createdAt).toLocaleDateString()}</strong>
          </div>
          <div>
            <small>Stage</small>
            <span className="status pending">NEW LEAD</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoanList({
  loans,
  user,
  sessionToken,
  onSelectLoan,
  onApprove,
  onReject,
  onDisburse,
  onPayment,
}: {
  loans: Loan[];
  user: User;
  sessionToken: string;
  onSelectLoan: (loan: Loan) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDisburse: (id: string) => void;
  onPayment: (
    id: string,
    payment: { utr: string; amount: number; date: string },
  ) => void;
}) {
  const isAdmin = user.role === "Admin";
  return (
    <div className="loan-list">
      {loans.map((loan) => (
          <div className="loan-row" key={loan._id}>
            <div className="loan-avatar">{loan.fullName.slice(0, 1)}</div>
            <div className="loan-person">
              <strong>{loan.fullName}</strong>
              <small>{loan.borrower?.email || "Borrower application"}</small>
            </div>
            <div>
              <small>Loan amount</small>
              <strong>{money(loan.amount)}</strong>
            </div>
            <div>
              <small>Status</small>
              <span className={`status ${statusTone[loan.status]}`}>
                {loan.status}
              </span>
            </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <small style={{ visibility: "hidden" }}>Actions</small>
            <div className="row-action">
              {loan.status !== "DISBURSED" && (
                <button
                  type="button"
                  className="btn-review-row"
                  onClick={() => onSelectLoan(loan)}
                  title={loan.status === "CLOSED" ? "View closed loan summary & documents" : "Review full borrower details, salary slip, and BRE checks"}
                >
                  👁 {loan.status === "CLOSED" ? "View Details" : "Review Details"}
                </button>
              )}
              {(isAdmin || user.role === "Sanction") &&
                loan.status === "APPLIED" && (
                  <>
                    <button
                      className="primary small"
                      onClick={() => onApprove(loan._id)}
                    >
                      Approve
                    </button>
                    <button
                      className="secondary small"
                      style={{ color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}
                      onClick={() => onReject(loan._id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              {(isAdmin || user.role === "Disbursement") &&
                loan.status === "SANCTIONED" && (
                  <button
                    className="primary small"
                    onClick={() => onDisburse(loan._id)}
                  >
                    Mark disbursed
                  </button>
                )}
              {(isAdmin || user.role === "Collection") &&
                loan.status === "DISBURSED" && (
                  <PaymentForm
                    loan={loan}
                    onSubmit={(payment) => onPayment(loan._id, payment)}
                  />
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentForm({
  loan,
  onSubmit,
}: {
  loan: Loan;
  onSubmit: (payment: { utr: string; amount: number; date: string }) => void;
}) {
  const paid = (loan.payments || []).reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const outstanding = Math.max(0, loan.totalRepayment - paid);
  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState(String(outstanding));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (utr.trim() && Number(amount) > 0)
      onSubmit({ utr: utr.trim(), amount: Number(amount), date });
  }
  return (
    <form className="payment-form" onSubmit={submit}>
      <span className="outstanding">
        Outstanding: {preciseMoney(outstanding)}
      </span>
      <input
        required
        value={utr}
        onChange={(event) => setUtr(event.target.value)}
        placeholder="UTR number"
        aria-label="UTR number"
      />
      <input
        required
        type="number"
        min="0.01"
        step="0.01"
        max={outstanding}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        aria-label="Payment amount"
      />
      <input
        required
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        aria-label="Payment date"
      />
      <button className="primary small" type="submit">
        Record payment
      </button>
    </form>
  );
}

function RejectionModal({
  reason,
  setReason,
  onCancel,
  onSubmit,
}: {
  reason: string;
  setReason: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="modal-panel"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <span className="step-label">Sanction decision</span>
        <h2>Reject this application?</h2>
        <p className="muted">Add a clear reason for the borrower record.</p>
        <textarea
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason for rejection"
          rows={4}
        />
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Reject application
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyQueue({
  title = "Nothing waiting here",
  detail = "New work will appear as borrowers move through the journey.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="empty-state">
      <span>◎</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
