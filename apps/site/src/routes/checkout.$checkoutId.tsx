import { useState, type ReactNode } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { LogIn } from "lucide-react";
import { formatMoney } from "../lib/format";
import { useDates } from "../lib/site";
import { getCheckoutPage, submitCheckoutCancel, submitTestPayment } from "../lib/site.functions";

export const Route = createFileRoute("/checkout/$checkoutId")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  loader: ({ params }) => getCheckoutPage({ data: { checkoutId: params.checkoutId } }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const page = Route.useLoaderData();
  const { checkoutId } = Route.useParams();

  if (page.kind === "checkout") return <Checkout checkout={page.checkout} />;
  if (page.kind === "signed_out") {
    return (
      <Shell title="Sign in to see this payment">
        <div className="actions">
          <a className="button" href={`/auth/start?returnTo=${encodeURIComponent(`/checkout/${checkoutId}`)}`}>
            <LogIn aria-hidden="true" />
            Sign in
          </a>
        </div>
      </Shell>
    );
  }
  return (
    <Shell title="This payment cannot be shown">
      <p>{page.kind === "error" ? page.message : "Open it from the device and account that started it."}</p>
      <p>
        <Link to="/account">Go to your account</Link>
      </p>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="message checkout" aria-labelledby="checkout-heading">
      <div className="wrap">
        <h1 id="checkout-heading">{title}</h1>
        {children}
      </div>
    </section>
  );
}

function Summary({ checkout }: { checkout: Schemas["Checkout"] }) {
  const dates = useDates();
  return (
    <dl className="plate checkout__summary">
      <div>
        <dt>Item</dt>
        <dd>
          {checkout.product_name}, {checkout.price_label}
        </dd>
      </div>
      {checkout.occurrence ? (
        <div>
          <dt>Time</dt>
          <dd>
            {checkout.occurrence.program_name}, {dates.dateTime(checkout.occurrence.starts_at)}
          </dd>
        </div>
      ) : null}
      {checkout.quantity > 1 || checkout.attendees.some((person) => person.guest) ? (
        <div>
          <dt>Who</dt>
          <dd>{checkout.attendees.map((person) => (person.guest ? `${person.name} (guest)` : `${person.name} (you)`)).join(", ")}</dd>
        </div>
      ) : null}
      <div>
        <dt>Amount</dt>
        <dd className="checkout__amount">{formatMoney(checkout.amount_minor, checkout.currency)}</dd>
      </div>
    </dl>
  );
}

function Checkout({ checkout }: { checkout: Schemas["Checkout"] }) {
  const dates = useDates();
  const router = useRouter();
  const [pending, setPending] = useState<"pay" | "cancel" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(kind: "pay" | "cancel") {
    setPending(kind);
    setProblem(null);
    try {
      const result =
        kind === "pay"
          ? await submitTestPayment({ data: { checkoutId: checkout.id } })
          : await submitCheckoutCancel({ data: { checkoutId: checkout.id } });
      if (!result.ok) setProblem(result.message);
      await router.invalidate();
    } catch {
      setProblem("Nothing was sent. Reload the page and try again.");
    } finally {
      setPending(null);
    }
  }

  if (checkout.status === "paid") {
    return (
      <Shell title={checkout.occurrence ? "You're booked" : "Payment received"}>
        <div className="notice" data-tone="success" role="status">
          <span className="lamp" data-state="active" aria-hidden="true" />
          <p className="notice__title">Paid {formatMoney(checkout.amount_minor, checkout.currency)}</p>
          <p className="notice__body">
            {checkout.occurrence
              ? `${checkout.quantity === 2 ? "Both spots" : checkout.quantity > 2 ? `All ${checkout.quantity} spots` : "Your spot"} in ${checkout.occurrence.program_name} on ${dates.dateTime(checkout.occurrence.starts_at)} ${checkout.quantity > 1 ? "are" : "is"} confirmed.`
              : `${checkout.product_name} is on your account. Use it to book classes from the schedule.`}
          </p>
        </div>
        <Summary checkout={checkout} />
        <div className="actions">
          <Link to="/account" className="button">
            See your account
          </Link>
          <Link to="/schedule" className="button button--quiet">
            Back to the schedule
          </Link>
        </div>
      </Shell>
    );
  }

  if (checkout.status === "expired" || checkout.status === "cancelled") {
    return (
      <Shell title={checkout.status === "expired" ? "This payment ran out of time" : "Payment cancelled"}>
        <p>Nothing was charged{checkout.occurrence ? ", and the held spot is free again" : ""}.</p>
        <Summary checkout={checkout} />
        <div className="actions">
          {checkout.occurrence ? (
            <Link to="/book/$occurrenceId" params={{ occurrenceId: checkout.occurrence.id }} className="button">
              Try again
            </Link>
          ) : (
            <Link to="/" hash="offers" className="button">
              Back to offers
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  // Open. Real providers take payment on their own page; only the local test provider lands here.
  return (
    <Shell title="Pay">
      <div className="notice" data-tone="warning">
        <span className="lamp" data-state="due" aria-hidden="true" />
        <p className="notice__title">Test payment</p>
        <p className="notice__body">
          This is the local test provider for development. No money moves and no card is needed. A real payment provider shows its
          own page here.
        </p>
      </div>
      <Summary checkout={checkout} />
      <p className="field__hint">
        {checkout.occurrence ? (checkout.quantity > 1 ? `Your ${checkout.quantity} spots are held until ` : "Your spot is held until ") : "This payment is open until "}
        <time dateTime={checkout.expires_at} suppressHydrationWarning>
          {dates.dateTime(checkout.expires_at)}
        </time>
        .
      </p>
      {problem ? (
        <div className="notice" data-tone="error" role="alert">
          <span className="lamp" data-state="denied" aria-hidden="true" />
          <p className="notice__title">That did not work</p>
          <p className="notice__body">{problem}</p>
        </div>
      ) : null}
      <div className="actions">
        <button type="button" className="button button--large" disabled={pending !== null} aria-busy={pending === "pay" || undefined} onClick={() => void run("pay")}>
          {pending === "pay" ? "Paying…" : `Pay ${formatMoney(checkout.amount_minor, checkout.currency)} (test)`}
        </button>
        <button type="button" className="button button--quiet" disabled={pending !== null} onClick={() => void run("cancel")}>
          {pending === "cancel" ? "Cancelling…" : "Cancel"}
        </button>
      </div>
    </Shell>
  );
}
