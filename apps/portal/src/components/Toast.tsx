import { useSyncExternalStore, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  Toast as ToastPart,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  toast as uiToast,
} from "@ui-sdk/react/toast";

/*
 * Toasts: short messages that confirm or report something that just happened.
 *
 *   const toast = useToast();
 *   toast.show({ tone: "success", title: "Payment recorded", body: "RM 180.00 by cash." });
 *   toast.show({ tone: "error", title: "Mei Ling Tan was not checked in.", action: { label: "Try again", onClick: retry } });
 *
 * Wrap the app once in <ToastProvider>. The root route already does this.
 * ui-sdk queues and times the toasts and pauses them while the pointer or
 * focus is in the region. Success and info toasts close after 6 seconds;
 * error toasts stay for 10 seconds and interrupt screen readers. At most three
 * show at once. A toast holds at most one action. The action closes the toast
 * and replaces the dismiss button, as in Paper.
 * Never use a toast as the only place an error appears. Show errors next to the
 * form too, because a toast leaves.
 */

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  tone: ToastTone;
  title: string;
  body?: string;
  /** One action, such as Try again. It runs, then the toast closes. */
  action?: { label: string; onClick: () => void };
};

type ToastApi = {
  /** Show a toast. Returns its id. */
  show: (toast: ToastInput) => string;
  /** Close a toast early. */
  dismiss: (id: string) => void;
};

const ICON: Record<ToastTone, IconName> = { success: "paid", error: "close", info: "notifications" };
const DURATION: Record<ToastTone, number> = { success: 6000, info: 6000, error: 10000 };

const api: ToastApi = {
  show: (input) =>
    uiToast({
      type: input.tone,
      title: input.title,
      description: input.body,
      duration: DURATION[input.tone],
      priority: input.tone === "error" ? "assertive" : "polite",
      action: input.action ? { label: input.action.label, onAction: input.action.onClick, dismiss: true } : undefined,
      data: input,
    }),
  dismiss: (id) => uiToast.dismiss(id),
};

export function useToast(): ToastApi {
  return api;
}

// Bottom right on a desk screen, top centre below 1181px, under the top bar.
const WIDE = "(min-width: 1181px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Wrap the app once. It renders the region that shows the toasts. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  return (
    <>
      {children}
      <ToastRegion
        className="toaster"
        side={wide ? "bottom" : "top"}
        align={wide ? "end" : "center"}
        maxVisible={3}
        expanded
      >
        {(item) => <ToastCard toast={item.data as ToastInput} />}
      </ToastRegion>
    </>
  );
}

function ToastCard({ toast }: { toast: ToastInput }) {
  const iconName = ICON[toast.tone];
  return (
    <ToastPart className="toast" data-tone={toast.tone} data-compact={toast.body ? undefined : true}>
      <Icon name={iconName} className="toast__icon" aria-hidden="true" focusable="false" />
      <div className="toast__text">
        <ToastTitle className="toast__title" />
        {toast.body ? <ToastDescription className="toast__body" /> : null}
      </div>
      {toast.action ? (
        <ToastAction className="toast__action" />
      ) : (
        <ToastClose className="toast__dismiss">
          <Icon name="close" aria-hidden="true" focusable="false" />
          <span className="visually-hidden">Dismiss: {toast.title}</span>
        </ToastClose>
      )}
    </ToastPart>
  );
}
