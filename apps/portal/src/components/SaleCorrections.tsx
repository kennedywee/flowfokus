import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { useToast } from "./Toast";
import { RadioCards } from "./RadioCards";
import { Field, FailureNotice, Notice, SubmitButton, describedBy } from "./ui";
import { PAYMENT_METHOD_LABEL, failureMessage, formatMoney, formatWhen, minorToInput, parseAmountToMinor } from "../lib/format";
import { useAction, useIdempotencyKey } from "../lib/hooks";
import { useCan, useOrganization } from "../lib/organization";
import { recordRefund, revokeSale, voidSale } from "../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Ban, ShieldOff, Undo2 } from "lucide-react";

const sendRefund = (input: Parameters<typeof recordRefund>[0]["data"]) => recordRefund({ data: input });
const sendVoid = (input: Parameters<typeof voidSale>[0]["data"]) => voidSale({ data: input });
const sendRevoke = (input: Parameters<typeof revokeSale>[0]["data"]) => revokeSale({ data: input });

type Correction = { kind: "refund" } | { kind: "void" } | { kind: "revoke" } | null;

/**
 * Corrections after a sale: refund money, void the sale, or revoke delivered
 * access. Each is a separate record with a reason. Rails decides whether it is
 * allowed now. The buttons only appear for staff with the permission.
 */
export function SaleCorrections({ sale }: { sale: Schemas["Sale"] }) {
  const can = useCan();
  const [open, setOpen] = useState<Correction>(null);
  const kept = sale.paid_minor - sale.refunded_minor;
  const refundable = sale.payments.filter((payment) => payment.amount_minor > payment.refunded_minor);
  const canVoid = can("purchases:void") && !sale.voided_at && !sale.fulfilled && kept === 0;
  const canRevoke = can("memberships:revoke") && sale.fulfillment !== null && !sale.fulfillment.revoked_at;
  const canRefund = can("purchases:refund") && refundable.length > 0;

  if (!canVoid && !canRevoke && !canRefund) return null;
  return (
    <div className="sale-corrections">
      {canRefund ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen({ kind: "refund" })}>
          <Undo2 aria-hidden="true" />
          Refund
        </Button>
      ) : null}
      {canRevoke ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen({ kind: "revoke" })}>
          <ShieldOff aria-hidden="true" />
          Revoke access
        </Button>
      ) : null}
      {canVoid ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen({ kind: "void" })}>
          <Ban aria-hidden="true" />
          Void sale
        </Button>
      ) : null}
      {open?.kind === "refund" ? <RefundDialog sale={sale} payments={refundable} onClose={() => setOpen(null)} /> : null}
      {open?.kind === "void" ? <ReasonDialog sale={sale} kind="void" onClose={() => setOpen(null)} /> : null}
      {open?.kind === "revoke" ? <ReasonDialog sale={sale} kind="revoke" onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function RefundDialog({ sale, payments, onClose }: { sale: Schemas["Sale"]; payments: Schemas["Payment"][]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendRefund);
  const [key, renewKey] = useIdempotencyKey();
  const [paymentId, setPaymentId] = useState(payments[0]!.id);
  const payment = payments.find((item) => item.id === paymentId) ?? payments[0]!;
  const left = payment.amount_minor - payment.refunded_minor;
  const [amount, setAmount] = useState(() => minorToInput(left, sale.currency));

  // Another payment has its own limit. Start from its full refundable amount.
  function choosePayment(id: string) {
    const next = payments.find((item) => item.id === id);
    if (!next) return;
    setPaymentId(id);
    setAmount(minorToInput(next.amount_minor - next.refunded_minor, sale.currency));
    setLocal((errors) => ({ ...errors, amount: undefined }));
  }
  const [reason, setReason] = useState("");
  const [local, setLocal] = useState<{ amount?: string; reason?: string }>({});
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountError = local.amount ?? server?.amount_minor?.join(" ");
  const reasonError = local.reason ?? server?.reason?.join(" ");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minor = parseAmountToMinor(amount, sale.currency);
    const errors: typeof local = {};
    if (minor === null || minor < 1 || minor > left) errors.amount = `Enter an amount up to ${formatMoney(left, sale.currency)}.`;
    if (!reason.trim()) errors.reason = "Enter why the money goes back.";
    setLocal(errors);
    if (errors.amount || errors.reason || minor === null) return;

    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      saleId: sale.id,
      payment_id: payment.id,
      amount_minor: minor,
      reason: reason.trim(),
    });
    if (result.ok) {
      renewKey();
      toast.show({
        tone: "success",
        title: "Refund recorded",
        body: `${formatMoney(minor, sale.currency)} back to ${sale.member.name}. Access is unchanged. Revoke it separately if needed.`,
      });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(value) => !value && !action.pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>Refund a payment</DialogTitle>
            <DialogDescription>
              {formatMoney(payment.amount_minor, payment.currency)} received. {formatMoney(left, payment.currency)} can be refunded.
              Flowfokus records the refund. It does not send money.
            </DialogDescription>
            {action.error && action.error.code !== "validation_failed" ? (
              <FailureNotice error={action.error} title="The refund was not recorded" />
            ) : null}
            <div className="form">
              {payments.length > 1 ? (
                <RadioCards
                  name="payment"
                  legend="Payment to refund"
                  value={paymentId}
                  onChange={choosePayment}
                  options={payments.map((item) => ({
                    value: item.id,
                    title: PAYMENT_METHOD_LABEL[item.method],
                    meta: formatWhen(item.received_at, organization.timezone),
                    trailing: <span className="money">{formatMoney(item.amount_minor - item.refunded_minor, item.currency)}</span>,
                  }))}
                />
              ) : null}
              <Field id="refund-amount" label={`Amount (${sale.currency})`} error={amountError}>
                <Input
                  id="refund-amount"
                  inputMode="decimal"
                  value={amount}
                  aria-invalid={amountError ? true : undefined}
                  aria-describedby={describedBy("refund-amount", undefined, amountError)}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field id="refund-reason" label="Reason" error={reasonError}>
                <Textarea
                  id="refund-reason"
                  rows={2}
                  maxLength={500}
                  value={reason}
                  aria-invalid={reasonError ? true : undefined}
                  aria-describedby={describedBy("refund-reason", undefined, reasonError)}
                  onChange={(event) => setReason(event.target.value)}
                />
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Recording…">
              Record refund
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const REASON_COPY = {
  void: {
    title: "Void this sale?",
    body: "The sale stays in the record as void. It takes no payments and cannot be delivered.",
    submit: "Void sale",
    done: "Sale voided",
  },
  revoke: {
    title: "Revoke the access from this sale?",
    body: "The period and access rights from this sale end now. Other periods, payments, and past visits stay.",
    submit: "Revoke access",
    done: "Access revoked",
  },
} as const;

function ReasonDialog({ sale, kind, onClose }: { sale: Schemas["Sale"]; kind: "void" | "revoke"; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const voiding = useAction(sendVoid);
  const revoking = useAction(sendRevoke);
  const action = kind === "void" ? voiding : revoking;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const copy = REASON_COPY[kind];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("Enter a reason. It stays on the record.");
      return;
    }
    setError(undefined);
    const input = { slug: organization.slug, saleId: sale.id, reason: reason.trim() };
    const result = kind === "void" ? await voiding.run(input) : await revoking.run(input);
    if (result.ok) {
      toast.show({ tone: "success", title: copy.done, body: sale.member.name });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(value) => !value && !action.pending && onClose()}>
      <DialogContent data-tone="critical">
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.body}</DialogDescription>
            {action.error ? (
              <Notice tone="error" title={`${copy.submit} did not work`} live>
                <p>{failureMessage(action.error)}</p>
              </Notice>
            ) : null}
            <Field id="correction-reason" label="Reason" error={error}>
              <Textarea
                id="correction-reason"
                rows={2}
                maxLength={500}
                value={reason}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy("correction-reason", undefined, error)}
                onChange={(event) => setReason(event.target.value)}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton variant="destructive" pending={action.pending} pendingLabel="Saving…">
              {copy.submit}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
