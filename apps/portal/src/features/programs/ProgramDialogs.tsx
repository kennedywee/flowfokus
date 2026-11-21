import { useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormNotice } from "../../components/FormNotice";
import { useToast } from "../../components/Toast";
import { SubmitButton } from "../../components/ui";
import { currencyDigits, failureMessage, formatMoney, parseAmountToMinor } from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import { addTicket, archivePrice, scheduleProgram, updatePrice } from "../../lib/staff.functions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SaleDialog } from "../sales/SaleDialogs";
import {
  MAX_WEEKS,
  PRICE_STATE_LABEL,
  checkPlan,
  checkTicket,
  endClock,
  planSummary,
  priceState,
  serverField,
  sessionsAdded,
  todayIn,
  type PlanErrors,
  type TicketErrors,
} from "./facts";

const sendSchedule = (input: Parameters<typeof scheduleProgram>[0]["data"]) => scheduleProgram({ data: input });
const sendTicket = (input: Parameters<typeof addTicket>[0]["data"]) => addTicket({ data: input });
const sendPriceChange = (input: Parameters<typeof updatePrice>[0]["data"]) => updatePrice({ data: input });
const sendArchive = (input: Parameters<typeof archivePrice>[0]["data"]) => archivePrice({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;

/** A label above the control and a one-line error under it. */
function DialogField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="program-field">
      <label className="program-field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="program-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Paper "Add sessions". Rails repeats one first date and start time weekly
 * for 1 to 26 weeks and skips a session that already exists at that time.
 */
export function AddSessionsDialog({ program, onClose }: { program: Schemas["ProgramDetail"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendSchedule);
  const [date, setDate] = useState(() => todayIn(organization.timezone));
  const [time, setTime] = useState("18:30");
  const [weeks, setWeeks] = useState(program.kind === "event" ? "1" : "4");
  const [errors, setErrors] = useState<PlanErrors>({});
  const summary = planSummary({ date, time, weeks: Number(weeks) || 1 });

  async function submit() {
    const found = checkPlan({ date, time, weeks });
    setErrors(found);
    if (found.date || found.time || found.weeks) return;
    const before = program.occurrences.length;
    const result = await action.run({ slug: organization.slug, id: program.id, date, time, weeks: Number(weeks) });
    if (!result.ok) return;
    // Both lists start at the beginning of today, so the difference is what Rails added.
    const added = sessionsAdded(result.data.occurrences.length - before, Number(weeks), program.capacity);
    onClose();
    toast.show({ tone: "success", ...added });
    void router.invalidate();
  }

  return (
    <SaleDialog
      title="Add sessions"
      wide
      className="program-dialog"
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(shortcut) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Adding…" aria-keyshortcuts="Meta+Enter Control+Enter">
          Add sessions
          {shortcut}
        </SubmitButton>
      )}
    >
      <div className="program-dialog__row">
        <DialogField id="sessions-time" label="Starts at" error={errors.time}>
          <span className="program-input program-input--suffix" data-invalid={errors.time ? true : undefined}>
            <input
              id="sessions-time"
              type="time"
              step={300}
              className="program-input__bare"
              value={time}
              autoFocus
              onChange={(event) => setTime(event.target.value)}
              aria-invalid={errors.time ? true : undefined}
              aria-describedby={errors.time ? "sessions-time-error" : undefined}
            />
            <span className="program-input__unit">to {endClock(time, program.duration_minutes)}</span>
          </span>
        </DialogField>
        <DialogField id="sessions-date" label="From" error={errors.date}>
          <Input
            id="sessions-date"
            type="date"
            className="program-input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? "sessions-date-error" : undefined}
          />
        </DialogField>
        <DialogField id="sessions-weeks" label="Repeat weekly for" error={errors.weeks}>
          <NativeSelect id="sessions-weeks" className="program-input" value={weeks} onChange={(event) => setWeeks(event.target.value)}>
            {Array.from({ length: MAX_WEEKS }, (_, index) => (
              <NativeSelectOption key={index} value={String(index + 1)}>
                {index === 0 ? "1 week" : `${index + 1} weeks`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </DialogField>
      </div>
      <p className="program-form__summary" aria-live="polite">
        <span className="program-form__summary-count">{summary.count}</span>
        <span className="program-form__summary-detail">
          {summary.detail} · {program.capacity} {program.capacity === 1 ? "spot" : "spots"} each
        </span>
      </p>
      {action.error ? <FormNotice title="No sessions were added" error={action.error} /> : null}
    </SaleDialog>
  );
}

/**
 * Paper "New ticket": a name and a price. A ticket buys spots in one
 * session; one sale can buy several spots. The amount is fixed once saved.
 */
export function NewTicketDialog({ program, onClose }: { program: Schemas["ProgramDetail"]; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendTicket);
  // A plain retry keeps the key, so Rails replays the first result instead of adding a second price.
  const [ticketKey, renewTicketKey] = useIdempotencyKey();
  const currency = organization.currency;
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [local, setLocal] = useState<TicketErrors>({});
  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const labelError = local.label ?? serverField(server?.label, "Name");
  const amountError = local.amount ?? serverField(server?.amount_minor, "Price");
  const symbol = new Intl.NumberFormat("en-MY", { style: "currency", currency }).formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;

  async function submit() {
    const amountMinor = parseAmountToMinor(amount, currency);
    const found = checkTicket(label, amountMinor, currency);
    setLocal(found);
    if (found.label || found.amount || amountMinor === null) return;
    const result = await action.run({ slug: organization.slug, id: program.id, idempotencyKey: ticketKey, label: label.trim(), amount_minor: amountMinor });
    // A changed form is a new request; a plain retry keeps the key.
    if (!result.ok) {
      if (result.error.code === "idempotency_key_reused") renewTicketKey();
      return;
    }
    onClose();
    toast.show({ tone: "success", title: "Ticket price added", body: `${label.trim()} is on sale for ${program.name}.` });
    void router.invalidate();
  }

  return (
    <SaleDialog
      title="New ticket"
      wide
      className="program-dialog"
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(shortcut) => (
        <SubmitButton compact pending={action.pending} pendingLabel="Adding…" aria-keyshortcuts="Meta+Enter Control+Enter">
          Add ticket
          {shortcut}
        </SubmitButton>
      )}
    >
      <div className="program-dialog__row program-dialog__row--ticket">
        <DialogField id="ticket-label" label="Name" error={labelError}>
          <Input
            id="ticket-label"
            className="program-input"
            value={label}
            maxLength={200}
            autoFocus
            placeholder="Drop-in or Early bird"
            onChange={(event) => setLabel(event.target.value)}
            aria-invalid={labelError ? true : undefined}
            aria-describedby={labelError ? "ticket-label-error" : undefined}
          />
        </DialogField>
        <DialogField id="ticket-amount" label="Price" error={amountError}>
          <span className="program-input program-input--suffix" data-invalid={amountError ? true : undefined}>
            <span className="program-input__unit">{symbol}</span>
            <input
              id="ticket-amount"
              className="program-input__bare"
              inputMode="decimal"
              autoComplete="off"
              placeholder={currencyDigits(currency) > 0 ? "0.00" : "0"}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={amountError ? true : undefined}
              aria-describedby={amountError ? "ticket-amount-error" : undefined}
            />
          </span>
        </DialogField>
      </div>
      <p className="program-dialog__note">Each ticket buys a spot in one session. The price is fixed once saved.</p>
      {action.error && action.error.code !== "validation_failed" ? (
        <FormNotice title="The ticket price was not added" error={action.error} />
      ) : null}
    </SaleDialog>
  );
}

/**
 * One ticket price on the program page: the name, Off sale or Archived with a
 * grey mark, the amount, and ⋯ with Put on sale or Take off sale, and Archive.
 */
export function TicketPriceRow({ price, manage }: { price: Schemas["Price"]; manage: boolean }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const change = useAction(sendPriceChange);
  const archive = useAction(sendArchive);
  const [confirming, setConfirming] = useState(false);
  const state = priceState(price);

  async function toggle() {
    const result = await change.run({ slug: organization.slug, id: price.id, available: !price.available });
    if (result.ok) {
      toast.show({ tone: "success", title: price.available ? "Price taken off sale" : "Price on sale again", body: price.label });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price did not change", body: failureMessage(result.error) });
    }
  }

  async function archiveNow() {
    const result = await archive.run({ slug: organization.slug, id: price.id });
    if (result.ok) {
      setConfirming(false);
      toast.show({ tone: "success", title: "Price archived", body: "Past sales keep it." });
      void router.invalidate();
    } else {
      setConfirming(false);
      toast.show({ tone: "error", title: "The price was not archived", body: failureMessage(result.error) });
    }
  }

  return (
    <li className="program-ticket" data-state={state}>
      <span className="program-ticket__name">{price.label}</span>
      {state === "on_sale" ? null : (
        <span className="program-ticket__state">
          {state === "archived" ? <Icon name="visibility" {...icon} /> : <Icon name="close" {...icon} />}
          {PRICE_STATE_LABEL[state]}
        </span>
      )}
      <span className="program-ticket__amount">{formatMoney(price.amount_minor, price.currency)}</span>
      {manage && state !== "archived" ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="program-ticket__more" aria-label={`Change ${price.label}`} disabled={change.pending || archive.pending}>
            <Icon name="more" {...icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="sale-menu">
            <DropdownMenuItem onClick={() => void toggle()}>
              <Icon name="products" {...icon} />
              {price.available ? "Take off sale" : "Put on sale"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="menu__item--critical" onClick={() => setConfirming(true)}>
              <Icon name="visibility" {...icon} />
              Archive price…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="program-ticket__more-slot" aria-hidden="true" />
      )}
      <ConfirmDialog
        open={confirming}
        tone="critical"
        title={`Archive ${price.label}?`}
        confirmLabel="Archive price"
        pendingLabel="Archiving…"
        pending={archive.pending}
        onConfirm={() => void archiveNow()}
        onCancel={() => setConfirming(false)}
      >
        <p>It can never go back on sale. Past sales keep this price.</p>
      </ConfirmDialog>
    </li>
  );
}
