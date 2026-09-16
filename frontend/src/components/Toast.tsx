/* ──────────────────────────────────────────────────────────────
 *  Toast.tsx — Global toast notification system
 *
 *  Provides an imperative `toast()` function that can be called
 *  from any component to show success, error, or info messages.
 *  Toasts auto-dismiss after 3.5s with a slide animation.
 *
 *  Usage:
 *    import { toast } from "../Toast";
 *    toast("Loan approved!", "success");
 *    toast("Something went wrong", "error");
 *    toast("Signed out", "info");
 * ────────────────────────────────────────────────────────────── */

"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────

/** Visual style of the toast notification. */
type ToastType = "success" | "error" | "info";

/** Internal shape of a queued toast message. */
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

/** Icon displayed inside the toast badge for each type. */
const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

/** How long a toast stays visible before fading out. */
const DISMISS_MS = 3500;

// ── Imperative API ─────────────────────────────────────────────

/**
 * Module-level reference to the state updater inside ToastContainer.
 * This allows `toast()` to be called imperatively from anywhere
 * without prop-drilling or React context providers.
 */
let pushToast: ((message: string, type: ToastType) => void) | null = null;

/**
 * Show a toast notification from anywhere in the application.
 *
 * @param message  Text displayed inside the toast.
 * @param type     Visual variant: "success" (default), "error", or "info".
 */
export function toast(message: string, type: ToastType = "success") {
  pushToast?.(message, type);
}

// ── Container Component ────────────────────────────────────────

/**
 * Renders the toast notification stack in a fixed overlay.
 * Mount this once at the application root so every `toast()`
 * call from any component is displayed.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /* Register the imperative push function on mount so the
     exported `toast()` can enqueue messages into React state. */
  useEffect(() => {
    pushToast = (message, type) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Schedule auto-dismiss after the CSS animation ends.
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, DISMISS_MS);
    };

    return () => {
      pushToast = null;
    };
  }, []);

  // Don't render anything when the queue is empty.
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]}</span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
