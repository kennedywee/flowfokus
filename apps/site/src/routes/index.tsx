import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { describeBenefit, formatDuration, formatMoney, listNames } from "../lib/format";
import { useGym, useSession } from "../lib/site";
import { submitCheckout } from "../lib/site.functions";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { organization, products } = useGym();
  const locationNames = organization.locations.map((location) => location.name);

  return (
    <>
      <section className="opening" aria-labelledby="gym-name">
        <div className="wrap">
          <h1 id="gym-name">{organization.name}</h1>
          {locationNames.length ? (
            <p className="opening__lede">
              {products.length === 1 ? "One plan" : `${products.length} memberships and passes`}
              {/* Past three names, the sentence gets hard to read. The Locations section lists them all. */}
              {locationNames.length <= 3 ? ` for ${listNames(locationNames)}.` : ` at ${locationNames.length} locations.`}
            </p>
          ) : null}
          <div className="door-plate">
            <span className="status">
              <span className="lamp" data-state="active" aria-hidden="true" />
              {organization.online_payments ? "Book and pay online" : "Join at the front desk"}
            </span>
            <span className="field__hint">
              {organization.online_payments
                ? "Members book classes and buy passes here. The front desk links your account the first time."
                : "Online payment is not available yet. Book and pay at the front desk."}
            </span>
          </div>
          <div className="actions">
            <Link to="/schedule" className="button button--large">
              See the schedule
            </Link>
            <a href="#offers" className="button button--quiet button--large">
              Memberships and passes
            </a>
            <Link to="/sign-in" className="button button--quiet button--large">
              Member sign-in
            </Link>
          </div>
        </div>
      </section>

      <section className="board" id="offers" aria-labelledby="offers-heading">
        <div className="wrap">
          <div className="board__head">
            <h2 id="offers-heading">Memberships and passes</h2>
            <p>Prices in {organization.currency}. Each one runs for the term shown, from the day you buy it.</p>
          </div>
          {products.length ? (
            <ul className="offers">
              {products.map((product) => (
                <Offer key={product.id} product={product} />
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p className="empty__title">Nothing listed yet</p>
              <p>Ask at the front desk about joining.</p>
            </div>
          )}
          <p className="board__note">
            {organization.online_payments
              ? "Pay online when signed in, or by cash or bank transfer at the front desk."
              : "Pay by cash or bank transfer at the front desk."}
          </p>
        </div>
      </section>

      <section className="locations" id="locations" aria-labelledby="locations-heading">
        <div className="wrap">
          <h2 id="locations-heading">{organization.locations.length === 1 ? "Location" : "Locations"}</h2>
          {organization.locations.length ? (
            <ul className="location-list">
              {organization.locations.map((location) => (
                <li key={location.name} className="plate location">
                  <h3>{location.name}</h3>
                  <address>{location.address ?? "Ask the gym for the address."}</address>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p className="empty__title">No locations listed yet</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Offer({ product }: { product: Schemas["PublicProduct"] }) {
  return (
    <li className="offer">
      <div className="offer__text">
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        <ul className="offer__benefits">
          {product.benefits.map((benefit, index) => (
            <li key={index}>
              <span className="lamp" aria-hidden="true" />
              {describeBenefit(benefit)}
            </li>
          ))}
        </ul>
      </div>
      <dl className="prices">
        {product.prices.map((price) => (
          <div key={price.id} className="price">
            <dt>{price.label}</dt>
            <dd className="price__amount">{formatMoney(price.amount_minor, price.currency)}</dd>
            <dd className="price__term">{formatDuration(price.duration_days)}</dd>
            <dd className="price__action">
              <BuyButton price={price} label={`${product.name}, ${price.label}`} />
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

/** Online purchase of a pass or membership. Signed-out visitors sign in first. */
function BuyButton({ price, label }: { price: Schemas["PublicPrice"]; label: string }) {
  const { organization } = useGym();
  const session = useSession();
  const navigate = useNavigate();
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<{ message: string; link: boolean } | null>(null);

  if (!organization.online_payments || !session.signInOn) return null;
  if (!session.person) {
    return (
      <a className="button button--quiet price__buy" href="/auth/start?returnTo=/%23offers">
        Sign in to buy<span className="visually-hidden"> {label}</span>
      </a>
    );
  }

  async function buy() {
    setPending(true);
    setProblem(null);
    try {
      const result = await submitCheckout({ data: { key, priceId: price.id } });
      if (!result.ok) {
        setProblem({ message: result.message, link: result.code === "member_not_linked" });
        setPending(false);
        return;
      }
      if (result.data.payment_url) {
        window.location.assign(result.data.payment_url);
        return;
      }
      await navigate({ to: "/checkout/$checkoutId", params: { checkoutId: result.data.id } });
    } catch {
      setProblem({ message: "The payment did not start. Reload the page and try again.", link: false });
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="button price__buy" disabled={pending} aria-busy={pending || undefined} onClick={() => void buy()}>
        {pending ? "Starting…" : "Buy online"}
        <span className="visually-hidden"> {label}</span>
      </button>
      {problem ? (
        <span className="price__problem" role="alert">
          {problem.message} {problem.link ? <Link to="/account">Enter your link code</Link> : null}
        </span>
      ) : null}
    </>
  );
}
