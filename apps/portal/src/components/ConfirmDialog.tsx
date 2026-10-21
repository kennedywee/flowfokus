import { useRef, type ReactNode } from "react";
import { ArrowRightLeft, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/*
 * A confirm dialog: one short decision, built on the shadcn alert dialog. Base
 * UI traps focus, makes the page inert, and returns focus to the button that
 * opened it.
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
 * The parent owns `open`. Escape and the Cancel button call `onCancel`; a
 * click outside does nothing, so the person must choose. While `pending` is
 * true, both are ignored. Repeat the action and the amount in `confirmLabel`.
 * Use tone="critical" for actions that cannot be undone: focus then starts on
 * Cancel.
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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const critical = tone === "critical";

  const Icon = critical ? TriangleAlert : ArrowRightLeft;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <AlertDialogContent tone={tone} initialFocus={critical ? cancelRef : confirmRef}>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Icon strokeWidth={1.75} focusable="false" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {children ? <AlertDialogDescription>{children}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button ref={cancelRef} variant="ghost" type="button" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <AlertDialogAction
            ref={confirmRef}
            variant={critical ? "destructive" : "default"}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {pendingLabel ?? confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
