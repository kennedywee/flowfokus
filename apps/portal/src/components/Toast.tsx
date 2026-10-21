import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, X, type LucideIcon } from "lucide-react";
import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";

/*
 * Toasts: short messages that confirm or report something that just happened.
 *
 *   const toast = useToast();
 *   toast.show({ tone: "success", title: "Payment recorded", body: "RM 180.00 by cash." });
 *
 * Wrap the app once in <ToastProvider>. The root route already does this.
 * Sonner, through the shadcn Toaster, stacks and times the toasts and pauses
 * them while the pointer is over them. Success and info toasts close after 6
 * seconds; error toasts stay for 10 seconds. At most three show at once.
 * Never use a toast as the only place an error appears. Show errors next to the
 * form too, because a toast leaves.
 */

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  tone: ToastTone;
  title: string;
  body?: string;
};

type ToastApi = {
  /** Show a toast. Returns its id. */
  show: (toast: ToastInput) => string | number;
  /** Close a toast early. */
  dismiss: (id: string | number) => void;
};

const ICON: Record<ToastTone, LucideIcon> = { success: CircleCheck, error: CircleX, info: Info };
const DURATION: Record<ToastTone, number> = { success: 6000, info: 6000, error: 10000 };

const api: ToastApi = {
  show: (input) => sonner.custom((id) => <ToastCard id={id} toast={input} />, { duration: DURATION[input.tone] }),
  dismiss: (id) => sonner.dismiss(id),
};

export function useToast(): ToastApi {
  return api;
}

/** Wrap the app once. It renders the shadcn Sonner region that shows the toasts. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

function ToastCard({ id, toast }: { id: string | number; toast: ToastInput }) {
  const Icon = ICON[toast.tone];
  return (
    <div className="toast" data-tone={toast.tone} role={toast.tone === "error" ? "alert" : undefined}>
      <Icon className="toast__icon" strokeWidth={2} aria-hidden="true" focusable="false" />
      <div className="toast__text">
        <p className="toast__title">{toast.title}</p>
        {toast.body ? <p className="toast__body">{toast.body}</p> : null}
      </div>
      <button type="button" className="toast__dismiss" onClick={() => sonner.dismiss(id)}>
        <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
        <span className="visually-hidden">Dismiss: {toast.title}</span>
      </button>
    </div>
  );
}
