import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Archive, CalendarDays, Clock, Dumbbell, EyeOff, Gift, Globe, MoreHorizontal, Pencil, StickyNote, Tag } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd } from "../../components/ui";
import { PRODUCT_KIND_LABEL, failureMessage, formatBenefitUsage, formatDuration, formatMoney, formatProgramScope } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { archivePrice, updatePrice, updateProduct } from "../../lib/staff.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { priceState } from "../programs/facts";
import { TicketPriceRow } from "../programs/ProgramDialogs";
import { SALE_STATE_LABEL, headFacts, mainPrice, otherPrices, passUses, priceName, saleState, type Product } from "./facts";
import { PRODUCT_ICON, ProductTile } from "./kinds";

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

const sendProduct = (input: Parameters<typeof updateProduct>[0]["data"]) => updateProduct({ data: input });
const sendPrice = (input: Parameters<typeof updatePrice>[0]["data"]) => updatePrice({ data: input });
const sendArchive = (input: Parameters<typeof archivePrice>[0]["data"]) => archivePrice({ data: input });

/**
 * Paper "Product details": the tile, the name, and the one price with its
 * terms. Sell (S), Edit (E), and ⋯ sit in the top bar for roles that can use
 * them. The page shows what the product gives, any other price still on sale,
 * and its properties. Every fact comes from the Rails product.
 */
export function ProductDetails({ product, programs }: { product: Product; programs: Schemas["ProgramListItem"][] }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const changeProduct = useAction(sendProduct);
  const changePrice = useAction(sendPrice);
  const archive = useAction(sendArchive);
  const [archiving, setArchiving] = useState(false);
  const manage = can("products:update");
  const price = mainPrice(product);
  const state = price ? priceState(price) : null;
  const canSell = can("purchases:create") && state === "on_sale";
  const busy = changeProduct.pending || changePrice.pending || archive.pending;

  const sell = () => {
    if (price) void navigate({ to: "/$org/sales/new", params: { org: organization.slug }, search: { price: price.id } });
  };
  const edit = () => void navigate({ to: "/$org/products/$productId/edit", params: { org: organization.slug, productId: product.id } });
  useShortcut("s", sell, { enabled: canSell });
  useShortcut("e", edit, { enabled: manage });

  async function togglePublished() {
    const result = await changeProduct.run({ slug: organization.slug, id: product.id, published: !product.published });
    if (result.ok) {
      toast.show({ tone: "success", title: product.published ? "Product is staff only" : "Product published", body: product.published ? "It left the gym site." : "Members can see it on the gym site." });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The product did not change", body: failureMessage(result.error) });
    }
  }

  async function toggleOnSale() {
    if (!price) return;
    const result = await changePrice.run({ slug: organization.slug, id: price.id, available: !price.available });
    if (result.ok) {
      toast.show({ tone: "success", title: price.available ? "Taken off sale" : "On sale again", body: product.name });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price did not change", body: failureMessage(result.error) });
    }
  }

  async function archiveNow() {
    if (!price) return;
    const result = await archive.run({ slug: organization.slug, id: price.id });
    setArchiving(false);
    if (result.ok) {
      toast.show({ tone: "success", title: "Price archived", body: "Members who bought it keep it." });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price was not archived", body: failureMessage(result.error) });
    }
  }

  const notSold = saleState(product) === "not_sold";

  return (
    <div className="page program-page product-page">
      <header className="program-head">
        <ProductTile kind={product.kind} size={40} />
        <div className="program-head__text">
          <h1 className="product-head__title">
            {product.name}
            {notSold ? <span className="programs-row__staff">Not sold</span> : null}
          </h1>
          <p className="product-head__facts">{headFacts(product)}</p>
        </div>
        <PageActions>
          {canSell ? (
            <Button type="button" variant="secondary" size="compact" className="product-head__sell" aria-keyshortcuts="S" onClick={sell}>
              Sell
              <Kbd>S</Kbd>
            </Button>
          ) : null}
          {manage ? (
            <Link
              to="/$org/products/$productId/edit"
              params={{ org: organization.slug, productId: product.id }}
              className={buttonVariants({ variant: "secondary", size: "compact" })}
              aria-keyshortcuts="E"
            >
              Edit
              <Kbd>E</Kbd>
            </Link>
          ) : null}
          {manage ? (
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions" disabled={busy}>
                <MoreHorizontal {...icon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="sale-menu">
                <DropdownMenuItem onClick={() => void togglePublished()}>
                  {product.published ? <EyeOff {...icon} /> : <Globe {...icon} />}
                  {product.published ? "Make staff only" : "Publish on the gym site"}
                </DropdownMenuItem>
                {price && state !== "archived" ? (
                  <DropdownMenuItem onClick={() => void toggleOnSale()}>
                    <Tag {...icon} />
                    {price.available ? "Take off sale" : "Put on sale"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={edit}>
                  <Pencil {...icon} />
                  Edit product
                  <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
                {price && state !== "archived" ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="menu__item--critical" onClick={() => setArchiving(true)}>
                      <Archive {...icon} />
                      Archive price…
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </PageActions>
      </header>

      <Properties product={product} />

      <div className="product-page__main">
        <OtherPrices product={product} manage={manage} />
        <Benefits product={product} programs={programs} />
      </div>

      {price ? (
        <ConfirmDialog
          open={archiving}
          tone="critical"
          title={`Archive ${formatMoney(price.amount_minor, price.currency)}?`}
          confirmLabel="Archive price"
          pendingLabel="Archiving…"
          pending={archive.pending}
          onConfirm={() => void archiveNow()}
          onCancel={() => setArchiving(false)}
        >
          <p>
            Staff can't sell this price again. Members who bought it keep it.
            {otherPrices(product).some((other) => priceState(other) === "on_sale") ? null : " To sell the product again, edit it and set a price."}
          </p>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

/* ---------- Other prices ---------- */

/** Prices beyond the one staff see: shown so staff can see and archive them. */
function OtherPrices({ product, manage }: { product: Product; manage: boolean }) {
  const others = otherPrices(product);
  if (!others.length) return null;
  const onSale = others.filter((price) => priceState(price) === "on_sale").length;
  return (
    <section className="mx-section" aria-labelledby="product-prices-title">
      <div className="mx-section__head">
        <Tag {...icon} />
        <h2 id="product-prices-title">Other prices</h2>
        {onSale ? <span className="mx-section__count">{onSale} also on sale</span> : null}
      </div>
      <ul className="program-tickets product-prices">
        {others.map((price) => (
          <TicketPriceRow key={price.id} price={{ ...price, label: priceName(price) }} manage={manage} />
        ))}
      </ul>
    </section>
  );
}

/* ---------- Benefits ---------- */

function Benefits({ product, programs }: { product: Product; programs: Schemas["ProgramListItem"][] }) {
  const locationName = useLocationName();
  const programName = (id: string) => programs.find((program) => program.id === id)?.name ?? "A program";
  return (
    <section className="mx-section" aria-labelledby="product-benefits-title">
      <div className="mx-section__head">
        <Gift {...icon} />
        <h2 id="product-benefits-title">Benefits</h2>
        <span className="mx-section__count">Changes apply to new sales</span>
      </div>
      {product.benefits.length ? (
        <ul className="product-benefits">
          {product.benefits.map((benefit) => {
            const Icon = benefit.kind === "gym_access" ? Dumbbell : CalendarDays;
            return (
              <li key={benefit.id} className="product-benefit">
                <span className="program-tile" aria-hidden="true">
                  <Icon {...icon} />
                </span>
                <span className="product-benefit__name">{benefit.name}</span>
                <span className="product-benefit__facts">
                  {[formatBenefitUsage(benefit), formatProgramScope(benefit, programName)].filter(Boolean).join(" · ")}
                </span>
                <span className="product-benefit__location">{locationName(benefit.location_id)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mx-empty">No benefits</p>
      )}
    </section>
  );
}

/* ---------- Properties ---------- */

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Properties({ product }: { product: Product }) {
  const price = mainPrice(product);
  const uses = passUses(product);
  const state = saleState(product);
  return (
    <aside className="mx-props program-props" aria-label="Product details">
      <section className="mx-props__group" aria-labelledby="product-props-title">
        <h2 id="product-props-title">Details</h2>
        <dl>
          <Property label="Type">
            <span className="mx-value">
              <ProductIcon kind={product.kind} />
              <span className="mx-value__text">{PRODUCT_KIND_LABEL[product.kind]}</span>
            </span>
          </Property>
          <Property label="Price">
            <span className="mx-value" data-empty={price ? undefined : true}>
              <Tag {...icon} />
              <span className="mx-value__text money">{price ? formatMoney(price.amount_minor, price.currency) : "No price"}</span>
            </span>
          </Property>
          {price ? (
            <Property label={product.kind === "pass" ? "Valid for" : "Length"}>
              <span className="mx-value">
                <Clock {...icon} />
                <span className="mx-value__text money">{formatDuration(price.duration_days)}</span>
              </span>
            </Property>
          ) : null}
          {uses ? (
            <Property label="Uses">
              <span className="mx-value">
                <CalendarDays {...icon} />
                <span className="mx-value__text money">{formatBenefitUsage(uses)}</span>
              </span>
            </Property>
          ) : null}
          {state === "not_sold" ? null : (
            <Property label="Sold">
              <span className="mx-value">
                {state === "on_sale" ? <Globe {...icon} /> : <EyeOff {...icon} />}
                <span className="mx-value__text">{state === "on_sale" ? "Gym site and desk" : SALE_STATE_LABEL.staff_only}</span>
              </span>
            </Property>
          )}
        </dl>
      </section>
      {product.description ? (
        <section className="mx-props__group program-props__note" aria-labelledby="product-note-title">
          <h2 id="product-note-title">
            <StickyNote {...icon} />
            Note
          </h2>
          <p>{product.description}</p>
        </section>
      ) : null}
    </aside>
  );
}

function ProductIcon({ kind }: { kind: Schemas["ProductKind"] }) {
  const Icon = PRODUCT_ICON[kind];
  return <Icon {...icon} />;
}

/* ---------- Loading and not found ---------- */

/** Paper's loading pattern: the tile, title, bands, and Details as grey bars. */
export function ProductLoading() {
  return (
    <div className="page program-page product-page" role="status" aria-busy="true" aria-label="Loading the product">
      <header className="program-head" aria-hidden="true">
        <span className="program-tile skeleton-block" data-size={40} />
        <div className="program-head__text">
          <span className="skeleton-line" style={{ width: 200, height: 16 }} />
          <span className="skeleton-line" style={{ width: 160 }} />
        </div>
      </header>
      <aside className="mx-props program-props" aria-hidden="true">
        <div className="mx-props__group">
          <h2>Details</h2>
          {[56, 48, 60, 52].map((width, index) => (
            <div key={index} className="mx-prop">
              <span className="skeleton-line" style={{ width }} />
              <span className="skeleton-line" style={{ width: 96, marginLeft: 24 }} />
            </div>
          ))}
        </div>
      </aside>
      <div className="product-page__main" aria-hidden="true">
        <div className="mx-section">
          <div className="mx-section__head">
            <span className="skeleton-line" style={{ width: 96 }} />
          </div>
          {[0, 1].map((index) => (
            <div key={index} className="product-benefit">
              <span className="program-tile skeleton-block" />
              <span className="skeleton-line" style={{ width: 120 }} />
              <span className="skeleton-line" style={{ width: 160 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** One line and one action: back to the list, or Try again. */
export function ProductDidNotLoad({ notFound, message }: { notFound: boolean; message: string }) {
  const organization = useOrganization();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="page program-page product-page">
      <div className="list-state" role="alert">
        <p className="list-state__title">{notFound ? "This product was not found." : "This product did not load."}</p>
        {notFound ? null : <p className="list-state__text">{message}</p>}
        {notFound ? (
          <Link to="/$org/products" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Back to Products
          </Link>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="compact"
            disabled={retrying}
            aria-busy={retrying || undefined}
            onClick={async () => {
              setRetrying(true);
              await router.invalidate();
              setRetrying(false);
            }}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
