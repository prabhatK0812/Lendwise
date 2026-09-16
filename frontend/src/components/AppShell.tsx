/* ──────────────────────────────────────────────────────────────
 *  AppShell.tsx — Shared authenticated layout shell
 *
 *  Renders the top navigation bar with branding, user identity,
 *  and a logout button. Wraps both the Borrower Portal and
 *  the Operations Dashboard to maintain consistent chrome.
 * ────────────────────────────────────────────────────────────── */

import { User } from "../types";

// AppShell provides the shared authenticated header for borrower and executive workspaces.
export function AppShell({
  children,
  user,
  onLogout,
  eyebrow = "Borrower workspace",
}: {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  eyebrow?: string;
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>
            Lendwise <small>/ LMS</small>
          </span>
        </div>
        <div className="user-menu">
          <span className="eyebrow">{eyebrow}</span>
          <span className="user-name">{user.name}</span>
          <button className="text-button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>
      {children}
    </main>
  );
}
