/* ──────────────────────────────────────────────────────────────
 *  AuthScreen.tsx — Login and signup interface
 *
 *  Split-panel layout with branding on the left and a compact
 *  auth form on the right. Supports toggling between login and
 *  signup modes. Signup always creates a Borrower account.
 * ────────────────────────────────────────────────────────────── */

"use client";

import { FormEvent } from "react";

type AuthValues = { name: string; email: string; password: string };

// Authentication is intentionally isolated from the business workflows so public and protected
// states are easy to reason about and test independently.
export function AuthScreen({
  mode,
  setMode,
  values,
  setValues,
  onSubmit,
  notice,
  busy,
}: {
  mode: "login" | "signup";
  setMode: (mode: "login" | "signup") => void;
  values: AuthValues;
  setValues: (values: AuthValues) => void;
  onSubmit: (event: FormEvent) => void;
  notice: string;
  busy: boolean;
}) {
  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="brand light">
          <span className="brand-mark">L</span>
          <span>
            Lendwise <small>/ LMS</small>
          </span>
        </div>
        <div className="art-copy">
          <p className="kicker">A clearer way to move money</p>
          <h1>Loans that move at the speed of trust.</h1>
          <p>
            One thoughtful workspace for borrowers and the teams behind every
            decision.
          </p>
        </div>
        <div className="art-footer">
          <span>Secure by design</span>
          <span>12% fixed annual rate</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-box">
          <p className="kicker">
            {mode === "login" ? "Welcome back" : "Start your application"}
          </p>
          <h2>
            {mode === "login" ? "Sign in to Lendwise" : "Create your account"}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Continue where you left off."
              : "Your loan journey begins with a few details."}
          </p>
          <form onSubmit={onSubmit}>
            {mode === "signup" && (
              <label>
                Full name
                <input
                  required
                  value={values.name}
                  onChange={(event) =>
                    setValues({ ...values, name: event.target.value })
                  }
                  placeholder="Aarav Mehta"
                />
              </label>
            )}
            <label>
              Email address
              <input
                required
                type="email"
                value={values.email}
                onChange={(event) =>
                  setValues({ ...values, email: event.target.value })
                }
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                required
                type="password"
                value={values.password}
                onChange={(event) =>
                  setValues({ ...values, password: event.target.value })
                }
                placeholder="Password@123"
              />
            </label>
            {notice && <div className="alert error">{notice}</div>}
            <button className="primary wide" disabled={busy}>
              {busy
                ? "Opening workspace..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <div className="switch-auth">
            {mode === "login" ? "New to Lendwise?" : "Already have an account?"}
            <button
              className="text-button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
          <p className="demo-note">
            Demo borrower: borrower@lms.demo / Password@123
          </p>
        </div>
      </section>
    </main>
  );
}
