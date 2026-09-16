/* ──────────────────────────────────────────────────────────────
 *  api.ts — HTTP client and session management
 *
 *  createApiRequest() returns a typed fetch wrapper that injects
 *  the JWT Bearer token into every request. Session helpers
 *  persist/restore/clear the token+user pair in localStorage.
 * ────────────────────────────────────────────────────────────── */

import { ApiRequest } from "../types";

export const API = process.env.NEXT_PUBLIC_API_URL || "";
export const SESSION_KEY = "lms-session";

// The API client owns authentication headers and error normalization so feature components
// can focus on workflow decisions instead of repeating fetch boilerplate.
export function createApiRequest(token: string): ApiRequest {
  return async (path, options = {}) => {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data.message || data.errors?.join(" ") || "Request failed",
      );
    }
    return data;
  };
}

export function saveSession(session: { token: string; user: unknown }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readSession(): { token: string; user: any } | null {
  const saved = localStorage.getItem(SESSION_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
