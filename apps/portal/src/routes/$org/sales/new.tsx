import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Combobox } from "../../../components/Combobox";
import { RadioCards } from "../../../components/RadioCards";
import { useToast } from "../../../components/Toast";
import {
  Empty,
  FailureNotice,
  Field,
  Money,
  Notice,
  PageHead,
  Plate,
  SkeletonRows,
  SubmitButton,
  describedBy,
} from "../../../components/ui";
import { failureMessage, formatDuration, formatMoney, formatUsage } from "../../../lib/format";
import { useAction, useIdempotencyKey } from "../../../lib/hooks";
import { useDeskLocation, useLocationName, useOrganization } from "../../../lib/organization";
import { createSale, listMembers, listProducts } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });

/** Up to this many offers show as cards. More than this show in a searchable list. */
const OFFER_CARD_LIMIT = 6;

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

/** A product with the prices that can be used for a new sale. */
interface Offer {
  product: Schemas["StaffProduct"];
  prices: Schemas["Price"][];
}

function NewSale() {
  const { members, products } = Route.useLoaderData();
  const organization = useOrganization();

  if (!members.ok || !products.ok) {
    return (
      <div className="page new-sale-page">
        <PageHead title="New sale" />
        {!members.ok ? <FailureNotice error={members.error} title="Members did not load" /> : null}
        {!products.ok ? <FailureNotice error={products.error} title="Offers did not load" /> : null}
      </div>
    );
  }

  const offers: Offer[] = products.data
    .map((product) => ({ product, prices: product.prices.filter((price) => price.available) }))
    .filter((offer) => offer.prices.length > 0);

  return (
    <div className="page new-sale-page">
      <PageHead
        title="New sale"
        description="One membership for one member. Record payment on the next screen. Partial payment is fine."
      />
      {members.data.length === 0 ? (
        <Empty title="Add a member first">
          <p>A sale needs a member. Add one, then come back.</p>
          <Link to="/$org/members" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "sm" })}>
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
  const toast = useToast();
  const search = Route.useSearch();
  const [key, renewKey] = useIdempotencyKey();
  const action = useAction(sendSale);

  const preselected = members.some((member) => member.id === search.member) ? search.member : "";
  const [memberId, setMemberId] = useState(preselected ?? "");
  const [productId, setProductId] = useState("");
  const [priceId, setPriceId] = useState("");
  // Start at the desk location, and follow it when the top bar changes it.
  const deskLocationId = useDeskLocation()?.id ?? "";
  const [locationId, setLocationId] = useState(deskLocationId);
  useEffect(() => setLocationId(deskLocationId), [deskLocationId]);
  const [local, setLocal] = useState<{ member?: string; product?: string; price?: string; location?: string }>({});

  const server = action.error?.code === "validation_failed" ? action.error.details : undefined;
  const memberError = local.member ?? server?.member_id?.join(" ");
  const productError = local.product;
  const priceError =
    local.price ?? server?.price_id?.join(" ") ?? (action.error?.code === "price_unavailable" ? action.error.message : undefined);
  const locationError = local.location ?? server?.location_id?.join(" ");

  const member = members.find((item) => item.id === memberId);
  const offer = offers.find((item) => item.product.id === productId);
  const price = offer?.prices.find((item) => item.id === priceId);
  const benefitsText = (product: Schemas["StaffProduct"]) =>
    product.benefits.map((benefit) => `${formatUsage(benefit.usage_limit)}, ${locationName(benefit.location_id)}`).join("; ");

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
      product: productId ? undefined : "Choose an offer.",
      price: priceId ? undefined : productId ? "Choose a price." : undefined,
      location: locationId ? undefined : "Choose where the sale happens.",
    };
    setLocal(errors);
    if (errors.member || errors.product || errors.price || errors.location) return;

    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      member_id: memberId,
      price_id: priceId,
      location_id: locationId,
    });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: "Sale recorded",
        body: `${member?.name ?? "The member"} has not paid yet. Record payment next.`,
      });
      void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: result.data.id } });
    }
  }

  const fieldErrorsShown = Boolean(memberError || productError || priceError || locationError);
  const showNotice =
    action.error && !(action.error.code === "validation_failed" && fieldErrorsShown) && action.error.code !== "price_unavailable";

  return (
    <form className="new-sale-page__layout" onSubmit={onSubmit} noValidate>
      <div className="stack">
        <Plate title="Member" icon={<span className="new-sale-page__step">1</span>} description="Who is buying?">
          <div className="form">
            <Combobox
              id="sale-member"
              label="Member"
              placeholder="Search by name or email"
              emptyText="No member matches. Check the spelling, or add the member first."
              options={members.map((item) => ({ value: item.id, label: item.name, detail: item.email }))}
              value={memberId || null}
              onChange={(value) => {
                setMemberId(value ?? "");
                setLocal((current) => ({ ...current, member: undefined }));
                edited();
              }}
              error={memberError}
              invalid={Boolean(memberError)}
              required
            />
            <Field id="sale-location" label="Sold at" error={locationError}>
              <NativeSelect
                id="sale-location"
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  setLocal((current) => ({ ...current, location: undefined }));
                  edited();
                }}
                aria-invalid={locationError ? true : undefined}
                aria-describedby={describedBy("sale-location", undefined, locationError)}
              >
                {organization.locations.map((location) => (
                  <NativeSelectOption key={location.id} value={location.id}>
                    {location.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </Plate>

        <Plate title="Offer" icon={<span className="new-sale-page__step">2</span>} description="What is the member buying?">
          {offers.length > OFFER_CARD_LIMIT ? (
            <Combobox
              id="sale-offer"
              label="Offer"
              placeholder="Search offers"
              emptyText="No offer matches. Check the spelling or clear the search."
              options={offers.map(({ product }) => ({
                value: product.id,
                label: `${product.name}${product.published ? "" : " (staff only)"}`,
                detail: benefitsText(product),
              }))}
              value={productId || null}
              onChange={(value) => {
                setProductId(value ?? "");
                setPriceId("");
                setLocal((current) => ({ ...current, product: undefined, price: undefined }));
                edited();
              }}
              error={productError}
              invalid={Boolean(productError)}
              required
            />
          ) : (
            <>
              <RadioCards
                name="product"
                legend="Offer"
                hideLegend
                options={offers.map(({ product }) => ({
                  value: product.id,
                  title: `${product.name}${product.published ? "" : " (staff only)"}`,
                  meta: benefitsText(product),
                }))}
                value={productId || null}
                onChange={(value) => {
                  setProductId(value);
                  setPriceId("");
                  setLocal((current) => ({ ...current, product: undefined, price: undefined }));
                  edited();
                }}
                describedBy={productError ? "sale-offer-error" : undefined}
              />
              {productError ? (
                <p className="field__error" id="sale-offer-error">
                  {productError}
                </p>
              ) : null}
            </>
          )}
        </Plate>

        <Plate title="Price" icon={<span className="new-sale-page__step">3</span>} description="Which price and term?">
          {offer ? (
            <>
              <RadioCards
                name="price"
                legend="Price"
                hideLegend
                options={offer.prices.map((item) => ({
                  value: item.id,
                  title: item.label,
                  meta: formatDuration(item.duration_days),
                  trailing: <Money minor={item.amount_minor} currency={item.currency} />,
                }))}
                value={priceId || null}
                onChange={(value) => {
                  setPriceId(value);
                  setLocal((current) => ({ ...current, price: undefined }));
                  edited();
                }}
                describedBy={priceError ? "sale-price-error" : undefined}
              />
              {priceError ? (
                <p className="field__error" id="sale-price-error">
                  {priceError}
                </p>
              ) : null}
            </>
          ) : (
            <p className="field__hint">Choose an offer first. Its prices show here.</p>
          )}
        </Plate>
      </div>

      <div className="stack new-sale-page__summary">
        <Plate title="Sale summary">
          <div className="readout">
            <span className="readout__label">Total</span>
            <span className="readout__value">{price ? formatMoney(price.amount_minor, price.currency) : "—"}</span>
          </div>
          <dl className="facts facts--rows">
            <div>
              <dt>Member</dt>
              <dd>{member?.name ?? "—"}</dd>
            </div>
            <div>
              <dt>Offer</dt>
              <dd>{offer?.product.name ?? "—"}</dd>
            </div>
            <div>
              <dt>Term</dt>
              <dd>{price ? formatDuration(price.duration_days) : "—"}</dd>
            </div>
          </dl>
          <p className="field__hint">The price and terms are saved with the sale. Later catalog changes do not affect it.</p>
          {showNotice && action.error ? (
            <Notice tone="error" title="The sale was not recorded" live>
              <p>{failureMessage(action.error)}</p>
              <p>Your choices are kept. Check them, then try again.</p>
            </Notice>
          ) : null}
          <div className="actions">
            <SubmitButton pending={action.pending} pendingLabel="Recording…" large>
              Record sale
            </SubmitButton>
          </div>
        </Plate>
      </div>
    </form>
  );
}
