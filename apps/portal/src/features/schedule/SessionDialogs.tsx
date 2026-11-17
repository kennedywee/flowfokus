import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { useToast } from "../../components/Toast";
import { SubmitButton, describedBy } from "../../components/ui";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import type { Failure } from "../../lib/result";
import { cancelBooking, cancelOccurrence } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { sessionName } from "./facts";

const sendCancelSession = (input: Parameters<typeof cancelOccurrence>[0]["data"]) => cancelOccurrence({ data: input });
const sendCancelBooking = (input: Parameters<typeof cancelBooking>[0]["data"]) => cancelBooking({ data: input });

/**
 * Paper "Cancel session" and "Cancel booking": a title, what happens, a
 * required reason, then Keep and the red action under a hairline. ⌘↵ submits.
 * Nothing closes the dialog while it saves.
 */
function ReasonDialog({
  id,
  title,
  text,
  keepLabel,
  confirmLabel,
  pendingLabel,
  pending,
  failure,
  failureTitle,
  missing,
  onClose,
  onConfirm,
  children,
}: {
  id: string;
  title: string;
  text: string;
  keepLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  failure: Failure | null;
  failureTitle: string;
  missing: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}) {
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const close = () => {
    if (!pending) onClose();
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!reason.trim()) {
      setError(missing);
      reasonRef.current?.focus();
      return;
    }
    setError(undefined);
    onConfirm(reason.trim());
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="sale-dialog reason-dialog" initialFocus={reasonRef}>
        <form noValidate onSubmit={submit} onKeyDown={onKeyDown}>
          <div className="reason-dialog__body">
            <DialogTitle className="reason-dialog__title">{title}</DialogTitle>
            <DialogDescription className="reason-dialog__text">{text}</DialogDescription>
            <div className="reason-dialog__field">
              <label htmlFor={id}>Reason</label>
              <Textarea
                ref={reasonRef}
                id={id}
                className="sale-input"
                rows={2}
                maxLength={500}
                value={reason}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, undefined, error)}
                onChange={(event) => setReason(event.target.value)}
              />
              <FieldError id={`${id}-error`}>{error}</FieldError>
            </div>
            {children}
            {failure ? (
              <div className="sale-dialog__failure" role="alert">
                <p className="sale-dialog__failure-title">{failureTitle}</p>
                <p>{failureMessage(failure)}</p>
              </div>
            ) : null}
          </div>
          <div className="sale-dialog__foot reason-dialog__foot">
            <Button type="button" variant="secondary" size="compact" disabled={pending} onClick={close}>
              {keepLabel}
            </Button>
            <SubmitButton compact variant="destructive" pending={pending} pendingLabel={pendingLabel} aria-keyshortcuts="Meta+Enter Control+Enter">
              {confirmLabel}
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Cancels every booking on the session. Rails returns each pass's credit. */
export function CancelSessionDialog({ roster, onClose }: { roster: Schemas["Roster"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendCancelSession);
  const booked = roster.bookings.filter((booking) => booking.status === "confirmed" || booking.status === "held").length;

  async function confirm(reason: string) {
    const result = await action.run({ slug: organization.slug, id: roster.id, reason });
    if (!result.ok) return;
    onClose();
    toast.show({
      tone: "success",
      title: "Session cancelled",
      body: booked ? (booked === 1 ? "1 booking cancelled" : `${booked} bookings cancelled`) : "Nobody was booked.",
    });
    void router.invalidate();
  }

  return (
    <ReasonDialog
      id="session-cancel-reason"
      title={`Cancel ${sessionName(roster.starts_at, organization.timezone)}?`}
      text={
        booked
          ? `${booked === 1 ? "The 1 booked member loses the spot" : `The ${booked} booked members lose their spots`}. Credits go back to their passes. Paid drop-ins stay on their sales for you to refund.`
          : "Nobody is booked yet."
      }
      keepLabel="Keep session"
      confirmLabel="Cancel session"
      pendingLabel="Cancelling…"
      pending={action.pending}
      failure={action.error}
      failureTitle="The session was not cancelled"
      missing="Enter why the session is cancelled."
      onClose={onClose}
      onConfirm={(reason) => void confirm(reason)}
    />
  );
}

/** Frees one spot. A pass can get its credit back; a ticket stays on its sale. */
export function CancelBookingDialog({ booking, onClose }: { booking: Schemas["Booking"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendCancelBooking);
  const withRight = booking.source === "entitlement";
  const [returnUse, setReturnUse] = useState(withRight);
  const name = booking.attendee_name;

  async function confirm(reason: string) {
    const result = await action.run({ slug: organization.slug, id: booking.id, reason, return_use: withRight && returnUse });
    if (!result.ok) return;
    onClose();
    toast.show({
      tone: "success",
      title: "Booking cancelled",
      body: !withRight ? `${name}'s spot is free.` : returnUse ? `${booking.holder.name} got the credit back` : `${booking.holder.name}'s credit was kept`,
    });
    void router.invalidate();
  }

  return (
    <ReasonDialog
      id={`booking-cancel-reason-${booking.id}`}
      title={`Cancel ${name}'s booking?`}
      text={
        withRight
          ? "The spot opens for someone else."
          : `The spot opens for someone else. The ${booking.entitlement?.name ?? "ticket"} stays on its sale for you to refund.`
      }
      keepLabel="Keep booking"
      confirmLabel="Cancel booking"
      pendingLabel="Cancelling…"
      pending={action.pending}
      failure={action.error}
      failureTitle="The booking was not cancelled"
      missing="Enter why the booking is cancelled."
      onClose={onClose}
      onConfirm={(reason) => void confirm(reason)}
    >
      {withRight ? (
        <label className="reason-dialog__check">
          <Checkbox checked={returnUse} onCheckedChange={(value) => setReturnUse(value === true)} />
          Give the credit back to {booking.entitlement?.name ?? "the pass"}
        </label>
      ) : null}
    </ReasonDialog>
  );
}
