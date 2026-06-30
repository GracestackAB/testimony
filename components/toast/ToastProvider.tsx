"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: ToastVariant; haptic?: boolean };

type ToastContextValue = {
  show: (message: string, options?: { variant?: ToastVariant; haptic?: boolean }) => void;
  success: (message: string, opts?: { haptic?: boolean }) => void;
  error: (message: string, opts?: { haptic?: boolean }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // noop
    }
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<ToastContextValue["show"]>((message, options = {}) => {
    const id = Date.now() + Math.random();
    const t: Toast = { id, message, variant: options.variant ?? "info", haptic: options.haptic };
    setToasts((arr) => [...arr, t]);
    if (t.haptic) vibrate(t.variant === "error" ? [40, 40, 40] : 12);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), 3500);
  }, []);

  const success = useCallback<ToastContextValue["success"]>(
    (message, opts) => show(message, { variant: "success", haptic: opts?.haptic }),
    [show]
  );
  const error = useCallback<ToastContextValue["error"]>(
    (message, opts) => show(message, { variant: "error", haptic: opts?.haptic }),
    [show]
  );

  // Keyboard-dismiss on Esc
  useEffect(() => {
    if (toasts.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToasts([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 flex flex-col gap-2 w-[min(calc(100vw-2rem),360px)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg shadow-lg border px-4 py-3 text-sm flex items-start gap-3 animate-[toast-in_180ms_ease-out] ${
              t.variant === "success"
                ? "bg-olive-600 text-parchment border-olive-700"
                : t.variant === "error"
                ? "bg-red-600 text-white border-red-700"
                : "bg-stone-900 text-parchment border-stone-800"
            }`}
          >
            <span className="mt-0.5 flex-shrink-0 text-base leading-none">
              {t.variant === "success" ? "✓" : t.variant === "error" ? "!" : "i"}
            </span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
              aria-label="Stäng"
              className="flex-shrink-0 opacity-80 hover:opacity-100 text-lg leading-none -mt-0.5"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback no-op provider (e.g. tests or SSR)
    return {
      show: () => {},
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}
