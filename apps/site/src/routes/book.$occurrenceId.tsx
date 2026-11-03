import { useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { LogIn } from "lucide-react";
import { formatMoney, PROGRAM_KIND_LABEL } from "../lib/format";
import { useDates, useGym } from "../lib/site";
import { getBookingPage, submitBooking, submitCheckout, submitCheckoutCancel } from "../lib/site.functions";

export const Route = createFileRoute("/book/$occurrenceId")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  loader: ({ params }) => getBookingPage({ data: { occurrenceId: params.occurrenceId } }),
  component: Book,
});

function Book() {
  const page = Route.useLoaderData();
  const { occurrenceId } = Route.useParams();
  const { organization } = useGym();
  const returnTo = `/book/${occurrenceId}`;

  if (page.kind === "off") {
    return (
      <Shell title="Online booking is not available here">
        <p>Book at the {organization.name} front desk.</p>
      </Shell>
    );
  }
  if (page.kind === "signed_out") {
    return (
      <Shell title="Sign in to book">
        <p>Sign in to book with your pass or membership, or to buy a ticket for this time.</p>
        <div className="actions">
          <a className="button" href={`/auth/start?returnTo=${encodeURIComponent(returnTo)}`}>
            <LogIn aria-hidden="true" />
            Sign in
          </a>
          <Link to="/schedule" className="button button--quiet">
            Back to the schedule
          </Link>
        </div>
      </Shell>
    );
  }
  if (page.kind === "not_linked") {
    return (
      <Shell title={`Link your account to ${organization.name} first`}>
        <p>Your sign-in is not linked to a member yet. Ask the front desk for a link code, then enter it on your account page.</p>
        <div className="actions">
          <Link to="/account" className="button">
            Enter a link code
          </Link>
        </div>
      </Shell>
    );
  }
  if (page.kind === "error") {
    return (
      <Shell title="This time cannot be booked">
        <Problem title="Something went wrong" body={page.message} />
        <p>
          <Link to="/schedule">Back to the schedule</Link>
        </p>
      </Shell>
    );
  }
  return <Options options={page.options} />;
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="message book" aria-labelledby="book-heading">
      <div className="wrap">
        <h1 id="book-heading">{title}</h1>
        {children}
      </div>
    </section>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return (
    <div className="notice" data-tone="error" role="alert">
      <span className="lamp" data-state="denied" aria-hidden="true" />
      <p className="notice__title">{title}</p>
      <p className="notice__body">{body}</p>
    </div>
  );
}

function rightLeft(right: Schemas["Entitlement"]): string {
  if (right.remaining === null) return "Unlimited";
  return right.remaining === 1 ? "1 booking left" : `${right.remaining} bookings left`;
}

function Options({ options }: { options: Schemas["MemberBookingOptions"] }) {
  const { organization } = useGym();
  const dates = useDates();
  const router = useRouter();
  const navigate = useNavigate();
  const { occurrence, program, rights, ticket_prices: prices, booking } = options;
  const [pending, setPending] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // One key per purchase attempt: a retry returns the same checkout. A changed group is a new purchase.
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  // A ticket can buy several spots: the member, guests, or both.
  const [count, setCount] = useState(1);
  const [meComing, setMeComing] = useState(true);
  const [guests, setGuests] = useState<{ name: string; email: string }[]>([]);
  const guestCount = count - (meComing ? 1 : 0);
  const maxSpots = Math.max(1, Math.min(10, occurrence.spots_left));

  function changeGroup(nextCount: number, nextMe: boolean) {
    const needed = Math.max(nextCount - (nextMe ? 1 : 0), 0);
    setCount(nextCount);
    setMeComing(nextMe);
    setGuests((list) => Array.from({ length: needed }, (_, index) => list[index] ?? { name: "", email: "" }));
    setCheckoutKey(crypto.randomUUID());
  }

  async function cancelHold(checkoutId: string) {
    setPending("cancel");
    setProblem(null);
    try {
      const result = await submitCheckoutCancel({ data: { checkoutId } });
      if (!result.ok) setProblem(result.message);
      await router.invalidate();
    } catch {
      setProblem("Nothing was sent. Reload the page and try again.");
    } finally {
      setPending(null);
    }
  }

  async function book(right: Schemas["Entitlement"]) {
    setPending(right.id);
    setProblem(null);
    try {
      const result = await submitBooking({ data: { occurrenceId: occurrence.id, entitlementId: right.id } });
      if (result.ok) {
        await router.invalidate();
        return;
      }
      setProblem(result.message);
    } catch {
      setProblem("The booking was not sent. Reload the page and try again.");
    } finally {
      setPending(null);
    }
  }

  async function buy(price: Schemas["Price"]) {
    if (guests.some((guest) => !guest.name.trim())) {
      setProblem("Give each guest a name.");
      return;
    }
    if (count < 1) return;
    setPending(price.id);
    setProblem(null);
    const group = count === 1 && meComing ? {} : {
      quantity: count,
      attendees: [
        ...(meComing ? [{ self: true as const }] : []),
        ...guests.map((guest) => ({ guest_name: guest.name.trim(), guest_email: guest.email.trim() || null })),
      ],
    };
    try {
      const result = await submitCheckout({ data: { key: checkoutKey, priceId: price.id, occurrenceId: occurrence.id, ...group } });
      if (!result.ok) {
        setProblem(result.message);
        setPending(null);
        return;
      }
      if (result.data.payment_url) {
        window.location.assign(result.data.payment_url);
        return;
      }
      await navigate({ to: "/checkout/$checkoutId", params: { checkoutId: result.data.id } });
    } catch {
      setProblem("The payment did not start. Reload the page and try again.");
      setPending(null);
    }
  }

  const when = `${dates.day(occurrence.starts_at)}, ${dates.time(occurrence.starts_at)} to ${dates.time(occurrence.ends_at)}`;
  const live = booking && (booking.status === "confirmed" || booking.status === "attended" || booking.status === "held");
  return (
    <section className="message book" aria-labelledby="book-heading">
      <div className="wrap">
        <p className="book__kind">{PROGRAM_KIND_LABEL[program.kind]}</p>
        <h1 id="book-heading">{program.name}</h1>
        <p className="book__when">
          <time dateTime={occurrence.starts_at} suppressHydrationWarning>
            {when}
          </time>
          <br />
          {program.location_name}
          {program.host_name ? ` · with ${program.host_name}` : ""}
        </p>
        {program.description ? <p>{program.description}</p> : null}

        {live ? (
          <div className="notice" data-tone="success" role="status">
            <span className="lamp" data-state="active" aria-hidden="true" />
            <p className="notice__title">{booking.status === "held" ? "Your spot is held for payment" : "You're booked"}</p>
            <p className="notice__body">
              {booking.status === "held"
                ? "Finish paying to keep it. The hold ends 30 minutes after you started."
                : booking.source === "ticket"
                  ? "Paid with a ticket. See it on your account page."
                  : `Booked with ${booking.entitlement?.name ?? "your pass"}. You can cancel on your account page before it starts.`}
            </p>
            {booking.status === "held" && booking.checkout_id ? (
              <div className="actions">
                <Link to="/checkout/$checkoutId" params={{ checkoutId: booking.checkout_id }} className="button">
                  Continue paying
                </Link>
                <button
                  type="button"
                  className="button button--quiet"
                  disabled={pending !== null}
                  aria-busy={pending === "cancel" || undefined}
                  onClick={() => void cancelHold(booking.checkout_id!)}
                >
                  {pending === "cancel" ? "Cancelling…" : "Cancel and free the spot"}
                </button>
              </div>
            ) : null}
            {problem ? <p className="account__error">{problem}</p> : null}
          </div>
        ) : occurrence.cancelled ? (
          <Problem title="This time was cancelled" body="Choose another time on the schedule." />
        ) : !occurrence.bookable ? (
          <Problem title="This time is full or has started" body="Choose another time on the schedule." />
        ) : (
          <>
            <p className="status">
              <span className="lamp" data-state="active" aria-hidden="true" />
              {occurrence.spots_left === 1 ? "1 spot left" : `${occurrence.spots_left} spots left`}
            </p>
            {problem ? <Problem title="Not booked" body={problem} /> : null}

            <h2>Use what you have</h2>
            {rights.length ? (
              <ul className="choices">
                {rights.map((right) => (
                  <li key={right.id} className="plate choice">
                    <span>
                      <strong>{right.name}</strong>
                      <span className="field__hint">
                        {rightLeft(right)} · valid until {dates.date(right.ends_at)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="button"
                      disabled={pending !== null}
                      aria-busy={pending === right.id || undefined}
                      onClick={() => void book(right)}
                    >
                      {pending === right.id ? "Booking…" : "Book with this"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field__hint">
                You have no pass or membership that covers this time.{" "}
                <Link to="/" hash="offers">
                  See passes and memberships
                </Link>
              </p>
            )}

            {prices.length ? (
              <>
                <h2>Buy a ticket</h2>
                {organization.online_payments ? (
                  <>
                  <div className="plate group">
                    <label className="group__row" htmlFor="group-count">
                      <span>Spots</span>
                      <select
                        id="group-count"
                        className="input group__count"
                        value={count}
                        onChange={(event) => changeGroup(Number(event.target.value), meComing)}
                      >
                        {Array.from({ length: maxSpots }, (_, index) => (
                          <option key={index} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="group__row group__me">
                      <input type="checkbox" checked={meComing} onChange={(event) => changeGroup(count, event.target.checked)} />
                      <span>I'm coming too</span>
                    </label>
                    {guests.map((guest, index) => (
                      <div key={index} className="group__guest">
                        <input
                          className="input"
                          aria-label={`Guest ${index + 1} name`}
                          placeholder={`Guest ${index + 1} name`}
                          maxLength={200}
                          value={guest.name}
                          onChange={(event) => {
                            setGuests((list) => list.map((item, at) => (at === index ? { ...item, name: event.target.value } : item)));
                            setCheckoutKey(crypto.randomUUID());
                          }}
                        />
                        <input
                          className="input"
                          type="email"
                          aria-label={`Guest ${index + 1} email, optional`}
                          placeholder="Email (optional)"
                          maxLength={320}
                          value={guest.email}
                          onChange={(event) => {
                            setGuests((list) => list.map((item, at) => (at === index ? { ...item, email: event.target.value } : item)));
                            setCheckoutKey(crypto.randomUUID());
                          }}
                        />
                      </div>
                    ))}
                    {count === 0 || (!meComing && guestCount === 0) ? <p className="field__hint">Add at least one person.</p> : null}
                    <p className="field__hint">
                      {count === 1 ? "One spot." : `${count} spots, one payment.`} Guests don't need an account; the front desk sees their names.
                    </p>
                  </div>
                  <ul className="choices">
                    {prices.map((price) => (
                      <li key={price.id} className="plate choice">
                        <span>
                          <strong>{price.label}</strong>
                          <span className="field__hint">{formatMoney(price.amount_minor, price.currency)} per spot</span>
                        </span>
                        <button
                          type="button"
                          className="button"
                          disabled={pending !== null}
                          aria-busy={pending === price.id || undefined}
                          onClick={() => void buy(price)}
                        >
                          {pending === price.id ? "Starting payment…" : `Pay ${formatMoney(price.amount_minor * count, price.currency)}`}
                        </button>
                      </li>
                    ))}
                  </ul>
                  </>
                ) : (
                  <p className="field__hint">
                    Tickets: {prices.map((price) => `${price.label} ${formatMoney(price.amount_minor, price.currency)}`).join(", ")}. Online
                    payment is not available yet. Buy one at the front desk.
                  </p>
                )}
              </>
            ) : null}
          </>
        )}
        <p>
          <Link to="/schedule">Back to the schedule</Link>
        </p>
      </div>
    </section>
  );
}
