import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Banknote, CalendarDays, IdCard, Landmark, Ticket, X, type LucideIcon } from "lucide-react";
import { useToast } from "../../components/Toast";
import { Kbd, SubmitButton, describedBy } from "../../components/ui";
import {
  PAYMENT_METHOD_LABEL,
  PRODUCT_KIND_LABEL,
  failureMessage,
  formatBenefitUsage,
  formatDate,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatWhen,
  minorToInput,
  parseAmountToMinor,
} from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import type { Failure } from "../../lib/result";
import { useLocationName, useOrganization } from "../../lib/organization";
import { useModKeyLabel } from "../../lib/shortcuts";
import { fulfillSale, recordPayment, recordRefund, revokeSale, voidSale } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { refundablePayments } from "./facts";

const sendPayment = (input: Parameters<typeof recordPayment>[0]["data"]) => recordPayment({ data: input });
const sendFulfill = (input: Parameters<typeof fulfillSale>[0]["data"]) => fulfillSale({ data: input });
const sendRefund = (input: Parameters<typeof recordRefund>[0]["data"]) => recordRefund({ data: input });
const sendVoid = (input: Parameters<typeof voidSale>[0]["data"]) => voidSale({ data: input });
const sendRevoke = (input: Parameters<typeof revokeSale>[0]["data"]) => revokeSale({ data: input });

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

export const KIND_ICON: Record<Schemas["ProductKind"], LucideIcon> = {
  membership: IdCard,
  pass: Ticket,
  ticket: CalendarDays,
};

/* ---------- Frame ---------- */

/**
 * The Paper dialog: a 48px header with the title, a fact on the right, and a
 * close button; the form; then Cancel and the action under a hairline. ⌘↵
 * (Ctrl+Enter elsewhere) submits. Nothing closes the dialog while it saves.
 */
export function SaleDialog({
  title,
  meta,
  wide = false,
  className,
  pending,
  onClose,
  onSubmit,
  submit,
  initialFocus,
  children,
}: {
  title: string;
  meta?: ReactNode;
  wide?: boolean;
  /** An extra class on the dialog, for a screen's own rules. */
  className?: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submit: (shortcut: ReactNode) => ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const mod = useModKeyLabel();
  const form = useRef<HTMLFormElement>(null);
  const close = () => {
    if (!pending) onClose();
  };
  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className={`sale-dialog${wide ? " sale-dialog--wide" : ""}${className ? ` ${className}` : ""}`} initialFocus={initialFocus}>
        <form
          ref={form}
          noValidate
          onKeyDown={onKeyDown}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!pending) onSubmit();
          }}
        >
          <div className="sale-dialog__head">
            <DialogTitle className="sale-dialog__title">{title}</DialogTitle>
            {meta ? <span className="sale-dialog__meta">{meta}</span> : null}
            <button type="button" className="sale-dialog__close" onClick={close} disabled={pending}>
              <X {...icon} />
              <span className="visually-hidden">Close</span>
            </button>
          </div>
          <div className="sale-dialog__body">{children}</div>
          <div className="sale-dialog__foot">
            <Button type="button" variant="secondary" size="compact" onClick={close} disabled={pending}>
              Cancel
            </Button>
            {submit(<Kbd>{mod}↵</Kbd>)}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A label on the left (88px) and the control on the right, as in the Paper refund and void dialogs. */
function Row({ id, label, error, children, top = false }: { id?: string; label: string; error?: string; children: ReactNode; top?: boolean }) {
  return (
    <div className="sale-field" data-top={top || undefined}>
      {id ? (
        <label className="sale-field__label" htmlFor={id}>
          {label}
        </label>
      ) : (
        <span className="sale-field__label">{label}</span>
      )}
      <div className="sale-field__control">
        {children}
        {id ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      </div>
    </div>
  );
}

/** A request failure inside a dialog. The form keeps what staff typed. */
export function DialogFailure({ title, error, next }: { title: string; error: Failure | null; next?: string }) {
  if (!error) return null;
  return (
    <div className="sale-dialog__failure" role="alert">
      <p className="sale-dialog__failure-title">{title}</p>
      <p>
        {failureMessage(error)}
        {next ? ` ${next}` : ""}
      </p>
    </div>
  );
}

/* ---------- Record payment ---------- */

const METHODS: { value: Schemas["ManualPaymentMethod"]; icon: LucideIcon }[] = [
  { value: "cash", icon: Banknote },
  { value: "bank_transfer", icon: Landmark },
];

/**
 * Records money the desk already received: cash or a bank transfer. It does
 * not charge a card or move money. The amount starts at the balance due.
 */
export function RecordPaymentDialog({ sale, onClose }: { sale: Schemas["Sale"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const [key, renewKey] = useIdempotencyKey();
  const action = useAction(sendPayment);
  const [amount, setAmount] = useState(() => minorToInput(sale.balance_minor, sale.currency));
  const [method, setMethod] = useState<Schemas["ManualPaymentMethod"]>("cash");
  const [reference, setReference] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();
  const due = formatMoney(sale.balance_minor, sale.currency);

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountError =
    localError ?? server?.amount_minor?.join(" ") ?? (action.error?.code === "overpayment" ? action.error.message : undefined);
  const otherError = action.error && action.error.code !== "overpayment" && !server?.amount_minor ? action.error : null;

  // A changed form is a new request: it gets a new key.
  function edited() {
    if (action.error) {
      renewKey();
      action.reset();
    }
  }

  async function submit() {
    const checked = checkPaymentAmount(amount, sale.balance_minor, sale.currency);
    if ("error" in checked) {
      setLocalError(checked.error);
      return;
    }
    const typed = checked.minor;
    setLocalError(undefined);
    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      saleId: sale.id,
      amount_minor: typed,
      method,
      reference: reference.trim() || null,
    });
    if (result.ok) {
      const done = result.data;
      renewKey();
      toast.show({
        tone: "success",
        title: "Payment recorded",
        body: `${formatMoney(typed, done.currency)} by ${PAYMENT_METHOD_LABEL[method].toLowerCase()}. ${
          done.balance_minor > 0 ? `${formatMoney(done.balance_minor, done.currency)} is still due.` : "Paid in full."
        }`,
      });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <SaleDialog
      title="Record payment"
      meta={`${due} due`}
      wide
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(kbd) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Recording…" aria-keyshortcuts="Meta+Enter Control+Enter">
          Record payment
          {kbd}
        </SubmitButton>
      )}
    >
      <PaymentFields
        currency={sale.currency}
        balance_minor={sale.balance_minor}
        method={method}
        amount={amount}
        reference={reference}
        amountError={amountError}
        onMethod={(value) => {
          setMethod(value);
          edited();
        }}
        onAmount={(value) => {
          setAmount(value);
          setLocalError(undefined);
          edited();
        }}
        onReference={(value) => {
          setReference(value);
          edited();
        }}
      />
      <p className="sale-dialog__note">Records money the desk already received. Flowfokus does not charge cards or move money.</p>
      <DialogFailure title="The payment was not recorded" error={otherError} next="Nothing was saved. Check the details and try again." />
    </SaleDialog>
  );
}

/**
 * The record-payment fields: Cash or Bank transfer, the amount with a Full
 * button for the balance, and an optional reference. New sale uses them too.
 */
export function PaymentFields({
  currency,
  balance_minor,
  method,
  amount,
  reference,
  amountError,
  onMethod,
  onAmount,
  onReference,
}: {
  currency: string;
  balance_minor: number;
  method: Schemas["ManualPaymentMethod"];
  amount: string;
  reference: string;
  amountError?: string;
  onMethod: (method: Schemas["ManualPaymentMethod"]) => void;
  onAmount: (amount: string) => void;
  onReference: (reference: string) => void;
}) {
  const typed = parseAmountToMinor(amount, currency);
  return (
    <>
      <fieldset className="sale-methods">
        <legend className="sale-stack__label">Method</legend>
        <div className="sale-methods__options">
          {METHODS.map(({ value, icon: Icon }) => (
            <label key={value} className="sale-method">
              <input
                type="radio"
                name="method"
                value={value}
                className="visually-hidden"
                checked={method === value}
                onChange={() => onMethod(value)}
              />
              <Icon {...icon} />
              {PAYMENT_METHOD_LABEL[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sale-stack__pair">
        <div className="sale-stack">
          <label className="sale-stack__label" htmlFor="payment-amount">
            Amount
          </label>
          <div className="sale-money" data-invalid={amountError ? true : undefined}>
            <span className="sale-money__currency">{currency}</span>
            <input
              id="payment-amount"
              className="sale-money__input"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={describedBy("payment-amount", undefined, amountError)}
              onChange={(event) => onAmount(event.target.value)}
            />
            <button
              type="button"
              className="sale-money__full"
              aria-pressed={typed === balance_minor}
              onClick={() => onAmount(minorToInput(balance_minor, currency))}
            >
              Full
            </button>
          </div>
          <FieldError id="payment-amount-error">{amountError}</FieldError>
        </div>
        <div className="sale-stack">
          <label className="sale-stack__label" htmlFor="payment-reference">
            Reference <span className="sale-stack__optional">(optional)</span>
          </label>
          <Input
            id="payment-reference"
            className="sale-input"
            maxLength={200}
            autoComplete="off"
            value={reference}
            onChange={(event) => onReference(event.target.value)}
          />
        </div>
      </div>
    </>
  );
}

/** Checks a typed payment amount against the balance. Returns the minor units or a message. */
export function checkPaymentAmount(amount: string, balance_minor: number, currency: string): { minor: number } | { error: string } {
  const typed = parseAmountToMinor(amount, currency);
  if (typed === null || typed <= 0) return { error: "Enter an amount above zero, for example 50 or 50.00." };
  if (typed > balance_minor) return { error: `The amount is more than the balance of ${formatMoney(balance_minor, currency)}.` };
  return { minor: typed };
}

/* ---------- Fulfill ---------- */

/** What fulfilling this sale creates, in one sentence. */
function fulfillmentConsequence(sale: Schemas["Sale"], timeZone: string): string {
  const kind = PRODUCT_KIND_LABEL[sale.line_item.terms.kind].toLowerCase();
  if (sale.occurrence) {
    const spots = sale.attendees.length > 1 ? `${sale.attendees.length} people get spots` : `${sale.attendees[0]?.name ?? sale.member.name} gets a spot`;
    return `${spots} in ${sale.occurrence.program_name} on ${formatDateTime(sale.occurrence.starts_at, timeZone)}. This books ${
      sale.attendees.length > 1 ? "every spot if they all fit" : "the spot if one is free"
    }.`;
  }
  return `${sale.member.name} gets ${sale.line_item.product_name} for ${formatDuration(sale.line_item.terms.duration_days)}. This creates the ${kind}'s access rights.`;
}

/**
 * Fulfills the sale: creates the membership period, pass rights, or booking.
 * When money is still due, staff with purchases:fulfill_unpaid fulfill early
 * and give a reason.
 */
export function FulfillDialog({ sale, early, onClose }: { sale: Schemas["Sale"]; early: boolean; onClose: () => void }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendFulfill);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const line = sale.line_item;
  const KindIcon = KIND_ICON[line.terms.kind];
  const kindLabel = PRODUCT_KIND_LABEL[line.terms.kind];

  async function submit() {
    if (early && !reason.trim()) {
      setReasonError("Enter why the member gets access before paying in full.");
      reasonRef.current?.focus();
      return;
    }
    setReasonError(undefined);
    const result = await action.run({ slug: organization.slug, saleId: sale.id, ...(early ? { early_reason: reason.trim() } : {}) });
    if (result.ok) {
      const period = result.data.fulfillment?.membership_period;
      toast.show({
        tone: "success",
        title: `${kindLabel} fulfilled`,
        body: period
          ? `${sale.member.name} has access from ${formatDate(period.starts_at, organization.timezone)} until ${formatDate(period.ends_at, organization.timezone)}.`
          : sale.member.name,
      });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <SaleDialog
      title={early ? "Fulfill before full payment" : "Fulfill"}
      meta={sale.member.name}
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      initialFocus={early ? reasonRef : undefined}
      submit={(kbd) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Fulfilling…" aria-keyshortcuts="Meta+Enter Control+Enter">
          {early ? "Fulfill early" : "Fulfill"}
          {kbd}
        </SubmitButton>
      )}
    >
      <div className="sale-item-card">
        <span className="sale-tile" aria-hidden="true">
          <KindIcon {...icon} />
        </span>
        <span className="sale-item-card__text">
          <span className="sale-item-card__name">{line.product_name}</span>
          <span className="sale-item-card__sub">
            {line.terms.benefits.map((benefit) => `${benefit.name}: ${formatBenefitUsage(benefit).toLowerCase()} at ${locationName(benefit.location_id)}`).join(" · ") ||
              `${kindLabel} · ${formatDuration(line.terms.duration_days)}`}
          </span>
        </span>
        <span className="sale-item-card__amount money">{formatMoney(line.total_minor, line.currency)}</span>
      </div>
      <p className="sale-dialog__text">{fulfillmentConsequence(sale, organization.timezone)}</p>
      {early ? (
        <>
          <p className="sale-dialog__warning">
            {formatMoney(sale.balance_minor, sale.currency)} stays due. Flowfokus records your name and the reason.
          </p>
          <Row id="early-reason" label="Reason" error={reasonError} top>
            <Textarea
              ref={reasonRef}
              id="early-reason"
              className="sale-input"
              rows={2}
              maxLength={500}
              value={reason}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={describedBy("early-reason", undefined, reasonError)}
              onChange={(event) => setReason(event.target.value)}
            />
          </Row>
        </>
      ) : null}
      <DialogFailure title="The sale was not fulfilled" error={action.error} next="Payments are kept. Try again." />
    </SaleDialog>
  );
}

/* ---------- Refund ---------- */

/**
 * Records money given back for one payment. Staff choose the payment here.
 * Flowfokus sends no money, and access stays until staff revoke it.
 */
export function RefundDialog({ sale, onClose }: { sale: Schemas["Sale"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendRefund);
  const [key, renewKey] = useIdempotencyKey();
  const payments = refundablePayments(sale);
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");
  const payment = payments.find((item) => item.id === paymentId) ?? payments[0];
  const left = payment ? payment.amount_minor - payment.refunded_minor : 0;
  const [amount, setAmount] = useState(() => minorToInput(left, sale.currency));
  const [reason, setReason] = useState("");
  const [local, setLocal] = useState<{ amount?: string; reason?: string }>({});
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountError = local.amount ?? server?.amount_minor?.join(" ");
  const reasonError = local.reason ?? server?.reason?.join(" ");
  const label = (item: Schemas["Payment"]) =>
    `${PAYMENT_METHOD_LABEL[item.method]} · ${formatMoney(item.amount_minor - item.refunded_minor, item.currency)} · ${formatWhen(item.received_at, organization.timezone)}`;

  function edited() {
    if (action.error) {
      renewKey();
      action.reset();
    }
  }

  async function submit() {
    if (!payment) return;
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
        body: `${formatMoney(minor, sale.currency)} back to ${sale.member.name}.${sale.fulfillment && !sale.fulfillment.revoked_at ? " Access is unchanged." : ""}`,
      });
      void router.invalidate();
      onClose();
    }
  }

  if (!payment) return null;
  return (
    <SaleDialog
      title="Refund"
      meta={sale.member.name}
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={() => (
        <SubmitButton compact variant="destructive" pending={action.pending} pendingLabel="Recording…">
          Refund
        </SubmitButton>
      )}
    >
      <Row id={payments.length > 1 ? "refund-payment" : undefined} label="Payment">
        {payments.length > 1 ? (
          <NativeSelect
            id="refund-payment"
            className="sale-input"
            value={paymentId}
            onChange={(event) => {
              const next = payments.find((item) => item.id === event.target.value);
              if (!next) return;
              setPaymentId(next.id);
              setAmount(minorToInput(next.amount_minor - next.refunded_minor, sale.currency));
              setLocal((errors) => ({ ...errors, amount: undefined }));
              edited();
            }}
          >
            {payments.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {label(item)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          <span className="sale-field__value">{label(payment)}</span>
        )}
      </Row>
      <Row id="refund-amount" label="Amount" error={amountError}>
        <div className="sale-money" data-invalid={amountError ? true : undefined}>
          <span className="sale-money__currency">{sale.currency}</span>
          <input
            id="refund-amount"
            className="sale-money__input"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={["refund-amount-limit", amountError ? "refund-amount-error" : null].filter(Boolean).join(" ")}
            onChange={(event) => {
              setAmount(event.target.value);
              setLocal((errors) => ({ ...errors, amount: undefined }));
              edited();
            }}
          />
          <span className="sale-money__hint" id="refund-amount-limit">
            Up to {formatMoney(left, sale.currency)}
          </span>
        </div>
      </Row>
      <Row id="refund-reason" label="Reason" error={reasonError} top>
        <Textarea
          id="refund-reason"
          className="sale-input"
          rows={2}
          maxLength={500}
          value={reason}
          aria-invalid={reasonError ? true : undefined}
          aria-describedby={describedBy("refund-reason", undefined, reasonError)}
          onChange={(event) => {
            setReason(event.target.value);
            setLocal((errors) => ({ ...errors, reason: undefined }));
            edited();
          }}
        />
      </Row>
      <p className="sale-dialog__note">
        Records money you give back. Flowfokus does not send it.
        {sale.fulfillment && !sale.fulfillment.revoked_at ? " Access stays; revoke it separately if needed." : ""}
      </p>
      <DialogFailure title="The refund was not recorded" error={action.error && !server ? action.error : null} />
    </SaleDialog>
  );
}

/* ---------- Void and revoke ---------- */

const REASON_COPY = {
  void: {
    title: "Void this sale?",
    body: "No money is kept on this sale. It stays in history as void, takes no payments, and cannot be fulfilled.",
    submit: "Void sale",
    pending: "Voiding…",
    done: "Sale voided",
  },
  revoke: {
    title: "Revoke access?",
    body: "The period and access rights from this sale end now. Payments, other periods, and past visits stay.",
    submit: "Revoke access",
    pending: "Revoking…",
    done: "Access revoked",
  },
} as const;

/** Voids a sale or revokes its access. Both need a reason, which stays on the record. */
export function ReasonDialog({ sale, kind, onClose }: { sale: Schemas["Sale"]; kind: "void" | "revoke"; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const voiding = useAction(sendVoid);
  const revoking = useAction(sendRevoke);
  const action = kind === "void" ? voiding : revoking;
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const copy = REASON_COPY[kind];

  async function submit() {
    if (!reason.trim()) {
      setError("Enter a reason. It stays on the record.");
      reasonRef.current?.focus();
      return;
    }
    setError(undefined);
    const input = { slug: organization.slug, saleId: sale.id, reason: reason.trim() };
    const result = kind === "void" ? await voiding.run(input) : await revoking.run(input);
    if (result.ok) {
      toast.show({ tone: "success", title: copy.done, body: `${sale.line_item.product_name} · ${sale.member.name}` });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <SaleDialog
      title={copy.title}
      meta={sale.member.name}
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      initialFocus={reasonRef}
      submit={() => (
        <SubmitButton compact variant="destructive" pending={action.pending} pendingLabel={copy.pending}>
          {copy.submit}
        </SubmitButton>
      )}
    >
      <p className="sale-dialog__text">{copy.body}</p>
      <Row id="correction-reason" label="Reason" error={error} top>
        <Textarea
          ref={reasonRef}
          id="correction-reason"
          className="sale-input"
          rows={2}
          maxLength={500}
          value={reason}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy("correction-reason", undefined, error)}
          onChange={(event) => setReason(event.target.value)}
        />
      </Row>
      <DialogFailure title={`${copy.submit} did not work`} error={action.error} />
    </SaleDialog>
  );
}
