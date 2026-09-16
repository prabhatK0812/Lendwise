/* ──────────────────────────────────────────────────────────────
 *  page.tsx — Application root and authentication gate
 *
 *  Restores JWT sessions from localStorage, handles login/signup
 *  flows, and routes authenticated users to their role-specific
 *  portal (Borrower → BorrowerPortal, Executive → Dashboard).
 * ────────────────────────────────────────────────────────────── */

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "../components/AuthScreen";
import { ToastContainer, toast } from "../components/Toast";
import { BorrowerPortal } from "../components/borrower/BorrowerPortal";
import { OperationsDashboard } from "../components/operations/OperationsDashboard";
import {
  clearSession,
  createApiRequest,
  readSession,
  saveSession,
} from "../lib/api";
import { User } from "../types";

// ── Root Component ─────────────────────────────────────────────
// Intentionally small: restores identity, handles auth, and
// delegates protected workflows to role-specific feature modules.

export default function Home() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState({
    name: "",
    email: "borrower@lms.demo",
    password: "Password@123",
  });

  // Restore the JWT session after refresh so the protected workspace remains available.
  useEffect(() => {
    const session = readSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
    }
  }, []);

  // Memoizing the client keeps child effects stable and prevents repeated dashboard requests.
  const request = useMemo(() => createApiRequest(token), [token]);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/signup";
      const data = await request(endpoint, {
        method: "POST",
        body: JSON.stringify(auth),
      });
      setToken(data.token);
      setUser(data.user);
      saveSession(data);
      // Notify the user with a welcome toast on successful authentication.
      toast(
        authMode === "login"
          ? `Welcome back, ${data.user.name}!`
          : `Account created! Welcome, ${data.user.name}.`,
      );
    } catch (error) {
      setNotice((error as Error).message);
      toast((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  /** Clear the JWT session and return to the login screen. */
  function logout() {
    clearSession();
    setToken("");
    setUser(null);
    toast("Signed out successfully", "info");
  }

  // ── Route by Role ──────────────────────────────────────────
  // Borrowers see the application portal; executives see the
  // operations dashboard filtered to their assigned module.

  const portal = !user ? (
    <AuthScreen
      mode={authMode}
      setMode={setAuthMode}
      values={auth}
      setValues={setAuth}
      onSubmit={authenticate}
      notice={notice}
      busy={busy}
    />
  ) : user.role === "Borrower" ? (
    <BorrowerPortal
      user={user}
      token={token}
      onLogout={logout}
      request={request}
    />
  ) : (
    <OperationsDashboard user={user} onLogout={logout} request={request} />
  );

  return (
    <>
      {portal}
      <ToastContainer />
    </>
  );
}
