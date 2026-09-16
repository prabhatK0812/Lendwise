"use client";

// The main loan lifecycle steps shown in sequence on the timeline.
const STEPS = [
  { key: "APPLIED", label: "Applied", desc: "Pending review", icon: "1" },
  { key: "SANCTIONED", label: "Sanctioned", desc: "Approved", icon: "2" },
  { key: "DISBURSED", label: "Disbursed", desc: "Funds released", icon: "3" },
  { key: "CLOSED", label: "Closed", desc: "Fully paid", icon: "4" },
];

const ORDER: Record<string, number> = {
  APPLIED: 0,
  SANCTIONED: 1,
  DISBURSED: 2,
  CLOSED: 3,
};

// Determine visual state of each timeline node relative to the current loan status.
function nodeState(stepKey: string, status: string): string {
  if (status === "REJECTED") {
    return stepKey === "APPLIED" ? "done" : "pending";
  }
  const current = ORDER[status] ?? 0;
  const step = ORDER[stepKey] ?? 0;
  if (step < current) return "done";
  if (step === current) return "active";
  return "pending";
}

export function StatusTimeline({
  status,
  rejectionReason,
  createdAt,
  updatedAt,
  disbursedAt,
}: {
  status: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  disbursedAt?: string;
}) {
  const isRejected = status === "REJECTED";

  function formatDate(d?: string) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const stepDates: Record<string, string | undefined> = {
    APPLIED: createdAt,
    SANCTIONED: (status === "SANCTIONED" || status === "DISBURSED" || status === "CLOSED") ? updatedAt : undefined,
    DISBURSED: (status === "DISBURSED" || status === "CLOSED") ? (disbursedAt || updatedAt) : undefined,
    CLOSED: status === "CLOSED" ? updatedAt : undefined,
  };

  return (
    <div className="status-timeline">
      <span className="tl-title">Loan journey</span>
      <div className="tl-track">
        {STEPS.map((step, index) => {
          const state = nodeState(step.key, status);
          return (
            <div className={`tl-node tl-${state}`} key={step.key}>
              {index < STEPS.length - 1 && (
                <div className={`tl-connector tl-conn-${state}`} />
              )}
              <div className="tl-circle">
                {state === "done" ? "✓" : step.icon}
              </div>
              <span className="tl-label">{step.label}</span>
              <span className="tl-desc">{step.desc}</span>
              {(state === "done" || state === "active") && stepDates[step.key] && (
                <span className="tl-date" style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>
                  {formatDate(stepDates[step.key])}
                </span>
              )}
              {step.key === "SANCTIONED" && isRejected && (
                <div className="tl-rejected-branch">
                  <div className="tl-branch-line" />
                  <div className="tl-rejected-node">
                    <div className="tl-circle">✕</div>
                    <span className="tl-label">Rejected</span>
                    {rejectionReason && (
                      <span className="tl-reject-reason">
                        {rejectionReason}
                      </span>
                    )}
                    {updatedAt && (
                      <span className="tl-date" style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, display: "block" }}>
                        {formatDate(updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
