import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";
import type { Schemas } from "@flowfokus/api";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { RadioCards } from "../../../components/RadioCards";
import { useToast } from "../../../components/Toast";
import {
  Empty,
  FailureNotice,
  Field,
  Lamp,
  Notice,
  PageHead,
  Plate,
  SkeletonRows,
  Status,
  SubmitButton,
  Time,
  buttonClass,
  describedBy,
} from "../../../components/ui";
import {
  PAYMENT_METHOD_LABEL,
  failureMessage,
  formatDate,
  formatDuration,
  formatMoney,
  formatUsage,
  minorToInput,
  parseAmountToMinor,
  saleState,
  saleStateLabel,
} from "../../../lib/format";
import { useAction, useIdempotencyKey } from "../../../lib/hooks";
import { useLocationName, useOrganization } from "../../../lib/organization";
import { fulfillSale, getSale, recordPayment } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

const sendPayment = (input: Parameters<typeof recordPayment>[0]["data"]) => recordPayment({ data: input });
const sendFulfill = (input: Parameters<typeof fulfillSale>[0]["data"]) => fulfillSale({ data: input });

export const Route = createFileRoute("/$org/sales/$saleId")({
  loader: ({ params }) => {
    if (!isUuid(params.saleId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Sale not found" } });
    }
    return getSale({ data: { slug: params.org, id: params.saleId } });
  },
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: SalePage,
});

function SalePage() {
  const sale = Route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  // The last payment this screen recorded. It stays visible after the form closes.
  const [recorded, setRecorded] = useState<{ saleId: string; text: string } | null>(null);

  if (!sale.ok) {
    return (
      <div className="page sale-page">
        <Crumbs />
        <FailureNotice error={sale.error} title="This sale did not load" />
      </div>
    );
  }

  const data = sale.data;
  const line = data.line_item;
  return (
    <div className="page sale-page">
      <Crumbs />
      <PageHead
        title={`${line.product_name}, ${line.price_label}`}
        description={
          <>
            Sold to{" "}
            <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: data.member.id }}>
              {data.member.name}
            </Link>{" "}
            at {locationName(data.location_id)}, <Time iso={data.purchased_at} timeZone={organization.timezone} />
          </>
        }
      >
        <Status state={saleState(data)}>{saleStateLabel(data)}</Status>
      </PageHead>

      <div className="sale-page__layout">
        <Plate title="Payment">
          <div className="sale-page__readouts">
            <div className="readout">
              <span className="readout__label">Total</span>
              <span className="readout__value">{formatMoney(data.total_minor, data.currency)}</span>
            </div>
            <div className="readout">
              <span className="readout__label">Paid</span>
              <span className="readout__value">{formatMoney(data.paid_minor, data.currency)}</span>
            </div>
            <div className="readout">
              <span className="readout__label">Balance</span>
              <span className="readout__value">{formatMoney(data.balance_minor, data.currency)}</span>
            </div>
          </div>
          {data.total_minor > 0 ? (
            <div className="meter" data-state={data.balance_minor > 0 ? "due" : undefined}>
              <div
                className="meter__track"
                role="meter"
                aria-label="Amount paid"
                aria-valuemin={0}
                aria-valuemax={data.total_minor}
                aria-valuenow={data.paid_minor}
                aria-valuetext={`${formatMoney(data.paid_minor, data.currency)} of ${formatMoney(data.total_minor, data.currency)}`}
              >
                <div className="meter__fill" style={{ transform: `scaleX(${data.paid_minor / data.total_minor})` }} />
              </div>
            </div>
          ) : null}
          <Payments sale={data} />
          {recorded?.saleId === data.id ? (
            <Notice tone="success" title="Payment recorded" live>
              <p>{recorded.text}</p>
            </Notice>
          ) : null}
          {data.balance_minor > 0 ? (
            <PaymentForm sale={data} onRecorded={(text) => setRecorded({ saleId: data.id, text })} />
          ) : null}
        </Plate>

        <div className="stack">
          <Delivery sale={data} />
          <Plate title="Purchased terms" description="Saved at purchase. Catalog changes never alter them.">
            <dl className="facts facts--rows">
              <div>
                <dt>Price</dt>
                <dd className="money">{formatMoney(line.unit_amount_minor, line.currency)}</dd>
              </div>
              <div>
                <dt>Term</dt>
                <dd>{formatDuration(line.terms.duration_days)}</dd>
              </div>
            </dl>
            <ul className="rights">
              {line.terms.benefits.map((benefit, index) => (
                <li key={index} className="right">
                  <span className="cell-title">{benefit.name}</span>
                  <span className="cell-sub">
                    {formatUsage(benefit.usage_limit)} · {locationName(benefit.location_id)}
                  </span>
                </li>
              ))}
            </ul>
          </Plate>
        </div>
      </div>
    </div>
  );
}

function Crumbs() {
  const organization = useOrganization();
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/$org/sales" params={{ org: organization.slug }}>
        Sales
      </Link>
      <span aria-hidden="true">/</span>
    </nav>
  );
}

function Payments({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  if (!sale.payments.length) {
    return (
      <Empty title="No payments yet">
        <p>Record cash or a bank transfer when the member pays.</p>
      </Empty>
    );
  }
  return (
    <ol className="timeline" aria-label="Payments">
      {sale.payments.map((payment) => (
        <li key={payment.id}>
          <Lamp state="paid" />
          <span>
            <span className="money cell-title">{formatMoney(payment.amount_minor, payment.currency)}</span>
            <span className="cell-sub">
              {PAYMENT_METHOD_LABEL[payment.method]}
              {payment.reference ? ` · Ref. ${payment.reference}` : ""}
            </span>
          </span>
          <Time iso={payment.received_at} timeZone={organization.timezone} />
        </li>
      ))}
    </ol>
  );
}

function PaymentForm({ sale, onRecorded }: { sale: Schemas["Sale"]; onRecorded: (text: string) => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const [key, renewKey] = useIdempotencyKey();
  const action = useAction(sendPayment);

  const [amount, setAmount] = useState(() => minorToInput(sale.balance_minor, sale.currency));
  const [method, setMethod] = useState<Schemas["PaymentMethod"]>("cash");
  const [reference, setReference] = useState("");
  const [localError, setLocalError] = useState<string | undefined>();

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const amountError =
    localError ??
    server?.amount_minor?.join(" ") ??
    (action.error?.code === "overpayment" ? action.error.message : undefined);
  const amountHint = `Balance: ${formatMoney(sale.balance_minor, sale.currency)}. A smaller amount leaves the rest due.`;

  function edited() {
    if (action.error) {
      renewKey();
      action.reset();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minor = parseAmountToMinor(amount, sale.currency);
    if (minor === null || minor <= 0) {
      setLocalError("Enter an amount above zero, for example 50 or 50.00.");
      return;
    }
    if (minor > sale.balance_minor) {
      setLocalError(`The amount is more than the balance of ${formatMoney(sale.balance_minor, sale.currency)}.`);
      return;
    }
    setLocalError(undefined);
    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      saleId: sale.id,
      amount_minor: minor,
      method,
      reference: reference.trim() || null,
    });
    if (result.ok) {
      const done = result.data;
      const text = `${formatMoney(minor, done.currency)} by ${PAYMENT_METHOD_LABEL[method].toLowerCase()}. Paid ${formatMoney(done.paid_minor, done.currency)} of ${formatMoney(done.total_minor, done.currency)}. Balance ${formatMoney(done.balance_minor, done.currency)}.`;
      renewKey();
      setReference("");
      setAmount(minorToInput(done.balance_minor, done.currency));
      onRecorded(text);
      toast.show({ tone: "success", title: "Payment recorded", body: text });
      void router.invalidate();
    }
  }

  return (
    <form className="form payment-form" onSubmit={onSubmit} noValidate aria-labelledby="payment-heading">
      <h3 id="payment-heading">Record payment</h3>
      <p className="field__hint">Record money already received at the desk. Flowfokus does not charge cards.</p>
      <RadioCards
        name="method"
        legend="Method"
        columns={2}
        options={[
          { value: "cash", title: PAYMENT_METHOD_LABEL.cash, meta: "Received at the desk" },
          { value: "bank_transfer", title: PAYMENT_METHOD_LABEL.bank_transfer, meta: "Add the bank reference" },
        ]}
        value={method}
        onChange={(value) => {
          setMethod(value as Schemas["PaymentMethod"]);
          edited();
        }}
      />
      <Field id="payment-amount" label="Amount" hint={amountHint} error={amountError}>
        <div className="input-group">
          <span className="input-group__affix" aria-hidden="true">
            {sale.currency}
          </span>
          <input
            id="payment-amount"
            className="input input--money"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setLocalError(undefined);
              edited();
            }}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={describedBy("payment-amount", amountHint, amountError)}
          />
        </div>
      </Field>
      <Field id="payment-reference" label="Reference (optional)" hint="Receipt number or bank reference.">
        <input
          id="payment-reference"
          className="input"
          maxLength={200}
          autoComplete="off"
          value={reference}
          onChange={(event) => {
            setReference(event.target.value);
            edited();
          }}
          aria-describedby="payment-reference-hint"
        />
      </Field>
      {action.error && action.error.code !== "overpayment" && !server?.amount_minor ? (
        <Notice tone="error" title="The payment was not recorded" live>
          <p>{failureMessage(action.error)}</p>
          <p>Nothing was saved. Check the details, then record the payment again.</p>
        </Notice>
      ) : null}
      <div className="actions">
        <SubmitButton pending={action.pending} pendingLabel="Recording…">
          Record payment
        </SubmitButton>
      </div>
    </form>
  );
}

function Delivery({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendFulfill);
  const [confirming, setConfirming] = useState(false);

  async function deliver() {
    const result = await action.run({ slug: organization.slug, saleId: sale.id });
    setConfirming(false);
    if (result.ok) {
      const period = result.data.fulfillment?.membership_period;
      toast.show({
        tone: "success",
        title: "Membership delivered",
        body: period
          ? `${sale.member.name} has access from ${formatDate(period.starts_at, organization.timezone)} until ${formatDate(period.ends_at, organization.timezone)}.`
          : `${sale.member.name} now has access.`,
      });
      void router.invalidate();
    }
  }

  if (sale.fulfillment) {
    const period = sale.fulfillment.membership_period;
    return (
      <Plate title="Delivery">
        <Notice tone="success" title="Membership delivered" live={action.data !== null}>
          <p>
            Access from {formatDate(period.starts_at, organization.timezone)} until{" "}
            {formatDate(period.ends_at, organization.timezone)}.{" "}
            <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: sale.member.id }}>
              See {sale.member.name}'s access
            </Link>
          </p>
        </Notice>
      </Plate>
    );
  }

  const paid = sale.balance_minor === 0;
  const reason = `Record the full payment first. ${formatMoney(sale.balance_minor, sale.currency)} is still due.`;
  return (
    <Plate title="Delivery">
      <div className="form">
        <p>
          {paid
            ? "The sale is fully paid. Deliver it to create the membership period and its access rights."
            : "Delivery opens when the sale is fully paid."}
        </p>
        <div className="sale-page__deliver">
          <button
            type="button"
            className={buttonClass()}
            disabled={!paid}
            aria-describedby={paid ? undefined : "deliver-reason"}
            onClick={() => setConfirming(true)}
          >
            <PackageCheck aria-hidden="true" strokeWidth={1.75} />
            Deliver membership
          </button>
          {paid ? null : (
            <p className="field__hint" id="deliver-reason">
              {reason}
            </p>
          )}
        </div>
        {action.error && !confirming ? (
          <Notice tone="error" title="The membership was not delivered" live>
            <p>{failureMessage(action.error)}</p>
            <p>The payment is kept. Try to deliver again.</p>
          </Notice>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Deliver this membership?"
        confirmLabel="Deliver membership"
        pendingLabel="Delivering…"
        pending={action.pending}
        onConfirm={() => void deliver()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {sale.member.name} gets {sale.line_item.product_name}, {sale.line_item.price_label}, for{" "}
          {formatDuration(sale.line_item.terms.duration_days)}. This creates the membership period and its access rights.
        </p>
      </ConfirmDialog>
    </Plate>
  );
}
