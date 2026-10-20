import { Link, createFileRoute } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { formatDuration, formatMoney, formatUsage, listNames } from "../lib/format";
import { useGym } from "../lib/site";

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
              {products.length === 1 ? "One membership" : `${products.length} memberships`} for{" "}
              {listNames(locationNames)}.
            </p>
          ) : null}
          <div className="door-plate">
            <span className="status">
              <span className="lamp" data-state="active" aria-hidden="true" />
              Join at the front desk
            </span>
            <span className="field__hint">Online sign-up and payment are not available yet.</span>
          </div>
          <div className="actions">
            <a href="#offers" className="button button--large">
              See memberships
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
            <h2 id="offers-heading">Memberships</h2>
            <p>Prices in {organization.currency}. Each membership runs for the term shown, from the day you join.</p>
          </div>
          {products.length ? (
            <ul className="offers">
              {products.map((product) => (
                <Offer key={product.id} product={product} />
              ))}
            </ul>
          ) : (
            <div className="empty">
              <p className="empty__title">No memberships listed yet</p>
              <p>Ask at the front desk about joining.</p>
            </div>
          )}
          <p className="board__note">Pay by cash or bank transfer at the front desk.</p>
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
              {benefit.name}: {formatUsage(benefit.usage_limit)}, {benefit.location_name ?? "every location"}
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
          </div>
        ))}
      </dl>
    </li>
  );
}
