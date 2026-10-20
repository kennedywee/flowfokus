import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowRightLeft, TriangleAlert } from "lucide-react";
import { buttonClass } from "./ui";

/*
 * A confirm dialog: one short decision, in a native <dialog> opened with
 * showModal(). The browser traps focus, makes the page inert, and returns
 * focus to the button that opened it.
 *
 *   <ConfirmDialog
 *     open={confirming}
 *     title="Record RM 180.00?"
 *     confirmLabel="Record RM 180.00"
 *     pendingLabel="Recording…"
 *     pending={action.pending}
 *     onConfirm={save}
 *     onCancel={() => setConfirming(false)}
 *   >
 *     <p>Cash from Marcus Ang. The balance becomes zero.</p>
 *   </ConfirmDialog>
 *
 * The parent owns `open`. Escape, the Cancel button, and a click on the
 * backdrop all call `onCancel`. While `pending` is true, all three are ignored.
 * Repeat the action and the amount in `confirmLabel`. Use tone="critical" for
 * actions that cannot be undone: focus then starts on Cancel.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  pending = false,
  tone = "default",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  tone?: "default" | "critical";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const critical = tone === "critical";

  // Keep the latest values for the native event handlers below.
  const state = useRef({ pending, onCancel });
  state.current = { pending, onCancel };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
      opener.current = null;
    }
  }, [open]);

  // Close the dialog if the component unmounts while it is open.
  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    function onCancelEvent(event: Event) {
      // Take over Escape so the parent stays the source of truth.
      event.preventDefault();
      if (!state.current.pending) state.current.onCancel();
    }
    dialog.addEventListener("cancel", onCancelEvent);
    return () => dialog.removeEventListener("cancel", onCancelEvent);
  }, []);

  const Icon = critical ? TriangleAlert : ArrowRightLeft;

  return (
    <dialog
      ref={ref}
      className="dialog"
      data-tone={tone}
      aria-labelledby={titleId}
      aria-describedby={children ? bodyId : undefined}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="dialog__body">
        <span className="dialog__icon" aria-hidden="true">
          <Icon strokeWidth={1.75} focusable="false" />
        </span>
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        {children ? (
          <div className="dialog__text" id={bodyId}>
            {children}
          </div>
        ) : null}
      </div>
      <div className="dialog__footer">
        <button
          type="button"
          className={buttonClass({ variant: "ghost" })}
          onClick={onCancel}
          disabled={pending}
          autoFocus={critical}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={buttonClass({ variant: critical ? "critical" : "primary" })}
          onClick={onConfirm}
          disabled={pending}
          aria-busy={pending || undefined}
          autoFocus={!critical}
        >
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {pendingLabel ?? confirmLabel}
            </>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </dialog>
  );
}
