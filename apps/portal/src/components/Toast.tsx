import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info, X, type LucideIcon } from "lucide-react";

/*
 * Toasts: short messages that confirm or report something that just happened.
 *
 *   const toast = useToast();
 *   toast.show({ tone: "success", title: "Payment recorded", body: "RM 180.00 by cash." });
 *
 * Wrap the app once in <ToastProvider>. The root route already does this.
 * Success and info toasts close after 6 seconds. Error toasts stay for 10 seconds.
 * A toast waits while the pointer is over it or focus is inside it.
 * Never use a toast as the only place an error appears. Show errors next to the
 * form too, because a toast leaves.
 */

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  tone: ToastTone;
  title: string;
  body?: string;
};

type ToastItem = ToastInput & { id: number };

type ToastApi = {
  /** Show a toast. Returns its id. */
  show: (toast: ToastInput) => number;
  /** Close a toast early. */
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const ICON: Record<ToastTone, LucideIcon> = { success: CircleCheck, error: CircleX, info: Info };
const DURATION: Record<ToastTone, number> = { success: 6000, info: 6000, error: 10000 };
const MAX_VISIBLE = 3;

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...input, id }].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The region exists before any toast, so screen readers announce new ones. */}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const Icon = ICON[toast.tone];
  const remaining = useRef(DURATION[toast.tone]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovered = useRef(false);
  const focused = useRef(false);

  const start = useCallback(() => {
    clearTimeout(timer.current);
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDismiss(toast.id), remaining.current);
  }, [onDismiss, toast.id]);

  const pause = useCallback(() => {
    if (timer.current === undefined) return;
    clearTimeout(timer.current);
    timer.current = undefined;
    remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
  }, []);

  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  function update() {
    if (hovered.current || focused.current) pause();
    else if (timer.current === undefined) start();
  }

  return (
    <div
      className="toast"
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : undefined}
      onMouseEnter={() => {
        hovered.current = true;
        update();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        update();
      }}
      onFocus={() => {
        focused.current = true;
        update();
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        focused.current = false;
        update();
      }}
    >
      <Icon className="toast__icon" strokeWidth={2} aria-hidden="true" focusable="false" />
      <div className="toast__text">
        <p className="toast__title">{toast.title}</p>
        {toast.body ? <p className="toast__body">{toast.body}</p> : null}
      </div>
      <button type="button" className="toast__dismiss" onClick={() => onDismiss(toast.id)}>
        <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
        <span className="visually-hidden">Dismiss: {toast.title}</span>
      </button>
    </div>
  );
}
