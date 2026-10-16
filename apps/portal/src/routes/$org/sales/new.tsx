import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@hydraflow/api";
import { Empty, FailureNotice, Field, PageHead, Plate, SkeletonRows, SubmitButton, describedBy } from "../../../components/ui";
import { formatDuration, formatMoney, formatUsage } from "../../../lib/format";
import { useAction, useIdempotencyKey } from "../../../lib/hooks";
import { useLocationName, useOrganization } from "../../../lib/organization";
import { createSale, listMembers, listProducts } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });

export const Route = createFileRoute("/$org/sales/new")({
  validateSearch: (search: Record<string, unknown>): { member?: string } =>
    isUuid(search.member) ? { member: search.member } : {},
  loader: async ({ params }) => {
    const [members, products] = await Promise.all([
      listMembers({ data: { slug: params.org } }),
      listProducts({ data: { slug: params.org } }),
    ]);
    return { members, products };
  },
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: NewSale,
});

interface Offer {
  product: Schemas["StaffProduct"];
  price: Schemas["Price"];
}

function NewSale() {
  const { members, products } = Route.useLoaderData();
  const organization = useOrganization();

  if (!members.ok || !products.ok) {
    return (
      <div className="page">
        <PageHead title="New sale" />
        {!members.ok ? <FailureNotice error={members.error} title="Members did not load" /> : null}
        {!products.ok ? <FailureNotice error={products.error} title="Offers did not load" /> : null}
      </div>
    );
  }

  const offers: Offer[] = products.data.flatMap((product) =>
    product.prices.filter((price) => price.available).map((price) => ({ product, price })),
  );

  return (
    <div className="page">
      <PageHead
        title="New sale"
        description="One membership for one member. Record payment on the next screen. Partial payment is fine."
      />
      {members.data.length === 0 ? (
        <Empty title="Add a member first">
          <Link to="/$org/members" params={{ org: organization.slug }} className="button button--quiet">
            Add a member
          </Link>
        </Empty>
      ) : offers.length === 0 ? (
        <Empty title="No offers can be sold">
          <p>Every price is archived or unavailable. Add a price in the catalog first.</p>
        </Empty>
      ) : (
        <SaleForm members={members.data} offers={offers} />
      )}
    </div>
  );
}

function SaleForm({ members, offers }: { members: Schemas["Member"][]; offers: Offer[] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [key, renewKey] = useIdempotencyKey();
  const action = useAction(sendSale);

  const preselected = members.some((member) => member.id === search.member) ? search.member : "";
  const [memberId, setMemberId] = useState(preselected ?? "");
  const [priceId, setPriceId] = useState("");
  const [locationId, setLocationId] = useState(organization.locations[0]?.id ?? "");
  const [local, setLocal] = useState<{ member?: string; price?: string; location?: string }>({});

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const memberError = local.member ?? server?.member_id?.join(" ");
  const priceError =
    local.price ?? server?.price_id?.join(" ") ?? (action.error?.code === "price_unavailable" ? action.error.message : undefined);
  const locationError = local.location ?? server?.location_id?.join(" ");
  const chosen = offers.find((offer) => offer.price.id === priceId);

  /** Changed values are a new request, so they need a new key. */
  function edited() {
    if (action.error) {
      renewKey();
      action.reset();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = {
      member: memberId ? undefined : "Choose the member who is buying.",
      price: priceId ? undefined : "Choose an offer.",
      location: locationId ? undefined : "Choose where the sale happens.",
    };
    setLocal(errors);
    if (errors.member || errors.price || errors.location) return;

    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      member_id: memberId,
      price_id: priceId,
      location_id: locationId,
    });
    if (result.ok) {
      void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: result.data.id } });
    }
  }

  const fieldErrorsShown = Boolean(memberError || priceError || locationError);
  return (
    <form className="grid-2 grid-2--wide-first" onSubmit={onSubmit} noValidate>
      <Plate title="Offer">
        <fieldset aria-describedby={priceError ? "offer-error" : undefined}>
          <legend className="visually-hidden">Offer</legend>
          <div className="choice-list">
            {offers.map(({ product, price }) => (
              <label key={price.id} className="choice">
                <input
                  type="radio"
                  name="price"
                  value={price.id}
                  checked={priceId === price.id}
                  onChange={() => {
                    setPriceId(price.id);
                    edited();
                  }}
                />
                <span className="choice__title">
                  {product.name}
                  {product.published ? "" : " (staff only)"}
                </span>
                <span className="choice__price">{formatMoney(price.amount_minor, price.currency)}</span>
                <span className="choice__meta">
                  {price.label} · {formatDuration(price.duration_days)} ·{" "}
                  {product.benefits
                    .map((benefit) => `${formatUsage(benefit.usage_limit)}, ${locationName(benefit.location_id)}`)
                    .join("; ")}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {priceError ? (
          <p className="field__error" id="offer-error">
            {priceError}
          </p>
        ) : null}
      </Plate>

      <Plate title="Sale">
        <div className="form">
          <Field id="sale-member" label="Member" error={memberError}>
            <select
              id="sale-member"
              className="select"
              value={memberId}
              onChange={(event) => {
                setMemberId(event.target.value);
                edited();
              }}
              aria-invalid={memberError ? true : undefined}
              aria-describedby={describedBy("sale-member", undefined, memberError)}
            >
              <option value="">Choose a member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.email}
                </option>
              ))}
            </select>
          </Field>
          <Field id="sale-location" label="Sold at" error={locationError}>
            <select
              id="sale-location"
              className="select"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                edited();
              }}
              aria-invalid={locationError ? true : undefined}
              aria-describedby={describedBy("sale-location", undefined, locationError)}
            >
              {organization.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <dl className="facts">
            <div>
              <dt>Total</dt>
              <dd className="money">{chosen ? formatMoney(chosen.price.amount_minor, chosen.price.currency) : "—"}</dd>
            </div>
            <div>
              <dt>Term</dt>
              <dd>{chosen ? formatDuration(chosen.price.duration_days) : "—"}</dd>
            </div>
          </dl>
          <p className="field__hint">
            The price and terms are saved with the sale. Later catalog changes do not affect it.
          </p>
          <div className="actions">
            <SubmitButton pending={action.pending} pendingLabel="Recording…" large>
              Record sale
            </SubmitButton>
          </div>
          {action.error && !(action.error.code === "validation_failed" && fieldErrorsShown) && action.error.code !== "price_unavailable" ? (
            <FailureNotice error={action.error} title="The sale was not recorded" />
          ) : null}
        </div>
      </Plate>
    </form>
  );
}
