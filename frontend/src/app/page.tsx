"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "../components/AuthScreen";
import { BorrowerPortal } from "../components/borrower/BorrowerPortal";
import { OperationsDashboard } from "../components/operations/OperationsDashboard";
import {
  clearSession,
  createApiRequest,
  readSession,
  saveSession,
} from "../lib/api";
import { User } from "../types";

// The route component is intentionally small: it restores identity, handles authentication,
// and delegates protected workflows to their feature modules.
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
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    clearSession();
    setToken("");
    setUser(null);
  }

  if (!user)
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        values={auth}
        setValues={setAuth}
        onSubmit={authenticate}
        notice={notice}
        busy={busy}
      />
    );
  if (user.role === "Borrower")
    return (
      <BorrowerPortal
        user={user}
        token={token}
        onLogout={logout}
        request={request}
      />
    );
  return (
    <OperationsDashboard user={user} onLogout={logout} request={request} />
  );
}
