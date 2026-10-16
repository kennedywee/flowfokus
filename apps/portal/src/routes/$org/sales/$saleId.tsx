import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { PackageCheck } from "lucide-react";
import type { Schemas } from "@hydraflow/api";
import { Empty, FailureNotice, Field, Lamp, Notice, PageHead, Plate, SkeletonRows, Status, SubmitButton, Time, describedBy } from "../../../components/ui";
import {
  PAYMENT_METHOD_LABEL,
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

  if (!sale.ok) {
    return (
      <div className="page">
        <Crumbs />
        <FailureNotice error={sale.error} title="This sale did not load" />
      </div>
    );
  }

  const data = sale.data;
  const line = data.line_item;
  return (
    <div className="page">
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

      <div className="grid-2">
        <Plate title="Payment">
          <dl className="facts">
            <div>
              <dt>Total</dt>
              <dd className="money">{formatMoney(data.total_minor, data.currency)}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd className="money">{formatMoney(data.paid_minor, data.currency)}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd className="money">{formatMoney(data.balance_minor, data.currency)}</dd>
            </div>
          </dl>
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
          {data.balance_minor > 0 ? <PaymentForm sale={data} /> : null}
        </Plate>

        <div className="stack">
          <Delivery sale={data} />
          <Plate title="Purchased terms" description="Saved at purchase. Catalog changes never alter them.">
            <dl className="facts">
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

function PaymentForm({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const router = useRouter();
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
      renewKey();
      setReference("");
      setAmount(minorToInput(result.data.balance_minor, result.data.currency));
      void router.invalidate();
    }
  }

  return (
    <form className="form payment-form" onSubmit={onSubmit} noValidate aria-labelledby="payment-heading">
      <h3 id="payment-heading">Record a payment</h3>
      <p className="field__hint">Record money already received at the desk. Hydraflow does not charge cards.</p>
      <div className="form-row">
        <Field id="payment-amount" label={`Amount (${sale.currency})`} hint={amountHint} error={amountError}>
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
        </Field>
        <fieldset className="field">
          <legend>Method</legend>
          <div className="choice-list choice-list--inline">
            {(["cash", "bank_transfer"] as const).map((value) => (
              <label key={value} className="choice choice--compact">
                <input
                  type="radio"
                  name="method"
                  value={value}
                  checked={method === value}
                  onChange={() => {
                    setMethod(value);
                    edited();
                  }}
                />
                <span className="choice__title">{PAYMENT_METHOD_LABEL[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
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
      <div className="actions">
        <SubmitButton pending={action.pending} pendingLabel="Recording…">
          Record payment
        </SubmitButton>
      </div>
      {action.error && action.error.code !== "overpayment" && !(server?.amount_minor) ? (
        <FailureNotice error={action.error} title="The payment was not recorded" />
      ) : null}
    </form>
  );
}

function Delivery({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const action = useAction(sendFulfill);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await action.run({ slug: organization.slug, saleId: sale.id });
    if (result.ok) void router.invalidate();
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
  return (
    <Plate title="Delivery">
      <form className="form" onSubmit={onSubmit} noValidate>
        <p>
          {paid
            ? "The sale is fully paid. Deliver it to create the membership period and its access rights."
            : `Delivery opens when the sale is fully paid. ${formatMoney(sale.balance_minor, sale.currency)} is still due.`}
        </p>
        <div className="actions">
          <SubmitButton pending={action.pending} pendingLabel="Delivering…" disabled={!paid}>
            <PackageCheck aria-hidden="true" />
            Deliver membership
          </SubmitButton>
        </div>
        {action.error ? <FailureNotice error={action.error} title="The membership was not delivered" /> : null}
      </form>
    </Plate>
  );
}
