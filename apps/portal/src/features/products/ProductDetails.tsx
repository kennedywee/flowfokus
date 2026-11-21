import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon, type IconName } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd } from "../../components/ui";
import { PRODUCT_KIND_LABEL, failureMessage, formatBenefitUsage, formatDuration, formatMoney, formatProgramScope } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { archivePrice, updatePrice, updateProduct } from "../../lib/staff.functions";
import { DetailHero, DetailLayout, HeroTile, PanelGroup, PanelRow, PanelRows } from "@/components/parts/DetailLayout";
import {
  CellStack,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { AllowanceBar, TagChip, Tile, type DotTone } from "@/components/parts/marks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, Section } from "../members/Section";
import { priceState, type PriceState } from "../programs/facts";
import { AddPriceDialog } from "./PriceDialogs";
import { PRICE_STATUS_LABEL, SALE_STATE_LABEL, mainPrice, saleState, sortedPrices, type Product, type SaleState } from "./facts";
import { PRODUCT_ICON } from "./kinds";

const icon = { "aria-hidden": true, focusable: false } as const;

const sendProduct = (input: Parameters<typeof updateProduct>[0]["data"]) => updateProduct({ data: input });
const sendPrice = (input: Parameters<typeof updatePrice>[0]["data"]) => updatePrice({ data: input });
const sendArchive = (input: Parameters<typeof archivePrice>[0]["data"]) => archivePrice({ data: input });

type Price = Schemas["Price"];

/**
 * Paper "Product details": the hero with the product's note, Prices, and
 * Benefits on the left; Details on the right, on the barcode pattern. Sell (S)
 * and Edit (E) sit in the top bar for roles that can use them, and Add price
 * is in the Prices header. Every fact comes from Rails. It leaves out what
 * Rails cannot supply yet (issue #21): active members and passes, revenue,
 * sales and average, credits left on passes, who is ending soon, product
 * activity and comments, and per-price counts.
 */
export function ProductDetails({ product, programs }: { product: Product; programs: Schemas["ProgramListItem"][] }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const changeProduct = useAction(sendProduct);
  const manage = can("products:update");
  const price = mainPrice(product);
  const canSell = can("purchases:create") && price !== null && priceState(price) === "on_sale";
  const [adding, setAdding] = useState(false);

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

  return (
    <>
      <DetailLayout record="product" className="product-details" panel={<ProductPanel product={product} />}>
        <ProductHero product={product} />
        <PageActions>
          {canSell ? (
            <Button type="button" size="compact" className="product-head__sell" aria-keyshortcuts="S" onClick={sell}>
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
              <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions" disabled={changeProduct.pending}>
                <Icon name="more" {...icon} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="sale-menu">
                <DropdownMenuItem onClick={() => void togglePublished()}>
                  {product.published ? <Icon name="visibility" {...icon} /> : <Icon name="gymSite" {...icon} />}
                  {product.published ? "Make staff only" : "Publish on the gym site"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={edit}>
                  <Icon name="edit" {...icon} />
                  Edit product
                  <DropdownMenuShortcut>E</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </PageActions>
        <PricesSection product={product} manage={manage} onAdd={() => setAdding(true)} />
        <BenefitsSection product={product} programs={programs} manage={manage} />
      </DetailLayout>
      {adding ? <AddPriceDialog product={product} onClose={() => setAdding(false)} /> : null}
    </>
  );
}

/* ---------- Hero ---------- */

const STATE_TONE: Record<SaleState, DotTone> = { on_sale: "good", staff_only: "info", not_sold: "neutral" };

/** The kind's tile, the name, the note as one muted line, and where the product is sold. */
function ProductHero({ product }: { product: Product }) {
  const state = saleState(product);
  return (
    <DetailHero tile={<HeroTile icon={PRODUCT_ICON[product.kind]} />} title={product.name} line={product.description ?? undefined}>
      <TagChip tone={STATE_TONE[state]}>{SALE_STATE_LABEL[state]}</TagChip>
    </DetailHero>
  );
}

/* ---------- Prices ---------- */

const PRICE_COLUMNS: ListColumn[] = [
  { id: "name", label: "Name" },
  { id: "length", label: "Length", width: "136px" },
  { id: "status", label: "Status", width: "128px" },
  { id: "price", label: "Price", width: "112px", align: "end" },
  { id: "actions", label: "Actions", width: "32px", hideLabel: true },
];

const PRICE_TONE: Record<PriceState, DotTone> = { on_sale: "good", off_sale: "neutral", archived: "neutral" };

/**
 * Every price the product has: name, length, status, and amount, with a row
 * menu to sell at it, take it off sale or put it on sale, and archive it. On
 * sale first, then not on sale, then archived in grey. An archived price can
 * never go back on sale. Add price (products:update) is in the header.
 */
function PricesSection({ product, manage, onAdd }: { product: Product; manage: boolean; onAdd: () => void }) {
  const prices = sortedPrices(product);
  return (
    <Section
      id="prices"
      title="Prices"
      action={
        manage ? (
          <Button type="button" variant="secondary" size="compact" onClick={onAdd}>
            <Icon name="plus" {...icon} />
            Add price
          </Button>
        ) : null
      }
    >
      {prices.length ? (
        <ListTable label="Prices" density="one-line" className="list-table--bare product-prices" columns={PRICE_COLUMNS}>
          <ListTableBody>
            {prices.map((price) => (
              <PriceRow key={price.id} product={product} price={price} manage={manage} />
            ))}
          </ListTableBody>
        </ListTable>
      ) : (
        <Empty>{manage ? "No price yet. Add one to sell this product." : "No price yet."}</Empty>
      )}
    </Section>
  );
}

function PriceRow({ product, price, manage }: { product: Product; price: Price; manage: boolean }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const change = useAction(sendPrice);
  const archive = useAction(sendArchive);
  const [confirming, setConfirming] = useState(false);
  const state = priceState(price);
  const canSell = can("purchases:create") && state === "on_sale";
  const canChange = manage && state !== "archived";
  const others = product.prices.filter((other) => other.id !== price.id && priceState(other) === "on_sale").length;

  async function toggle() {
    const result = await change.run({ slug: organization.slug, id: price.id, available: !price.available });
    if (result.ok) {
      toast.show({ tone: "success", title: price.available ? "Taken off sale" : "On sale again", body: `${price.label} · ${formatMoney(price.amount_minor, price.currency)}` });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price did not change", body: failureMessage(result.error) });
    }
  }

  async function archiveNow() {
    const result = await archive.run({ slug: organization.slug, id: price.id });
    setConfirming(false);
    if (result.ok) {
      toast.show({ tone: "success", title: "Price archived", body: "Members who bought it keep it." });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The price was not archived", body: failureMessage(result.error) });
    }
  }

  return (
    <ListTableRow className={state === "archived" ? "product-prices__row--archived" : undefined}>
      <ListTableCell className="product-prices__name">{price.label}</ListTableCell>
      <ListTableCell className="cell-muted">{formatDuration(price.duration_days)}</ListTableCell>
      <ListTableCell>
        <span className="products-status">
          <i className="dot" data-tone={PRICE_TONE[state]} aria-hidden="true" />
          {PRICE_STATUS_LABEL[state]}
        </span>
      </ListTableCell>
      <ListTableCell align="end" className="cell-figure">
        {formatMoney(price.amount_minor, price.currency)}
      </ListTableCell>
      <ListTableCell align="end">
        {canSell || canChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={buttonVariants({ variant: "ghost", size: "icon-compact" })}
              aria-label={`Change ${price.label}, ${formatMoney(price.amount_minor, price.currency)}`}
              disabled={change.pending || archive.pending}
            >
              <Icon name="more" {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sale-menu">
              {canSell ? (
                <DropdownMenuItem
                  onClick={() => void navigate({ to: "/$org/sales/new", params: { org: organization.slug }, search: { price: price.id } })}
                >
                  <Icon name="sales" {...icon} />
                  Sell at this price
                </DropdownMenuItem>
              ) : null}
              {canChange ? (
                <DropdownMenuItem onClick={() => void toggle()}>
                  <Icon name="products" {...icon} />
                  {price.available ? "Take off sale" : "Put on sale"}
                </DropdownMenuItem>
              ) : null}
              {canChange ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="menu__item--critical" onClick={() => setConfirming(true)}>
                    <Icon name="close" {...icon} />
                    Archive price…
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <ConfirmDialog
          open={confirming}
          tone="critical"
          title={`Archive ${formatMoney(price.amount_minor, price.currency)}?`}
          confirmLabel="Archive price"
          pendingLabel="Archiving…"
          pending={archive.pending}
          onConfirm={() => void archiveNow()}
          onCancel={() => setConfirming(false)}
        >
          <p>
            Staff can't sell this price again. Members who bought it keep it.
            {state === "on_sale" && others === 0 ? " No other price is on sale, so the product will not be for sale until you add one." : ""}
          </p>
        </ConfirmDialog>
      </ListTableCell>
    </ListTableRow>
  );
}

/* ---------- Benefits ---------- */

const BENEFIT_COLUMNS: ListColumn[] = [
  { id: "benefit", label: "Benefit" },
  { id: "amount", label: "Amount", width: "232px" },
  { id: "location", label: "Location", width: "128px" },
];

/**
 * What the product gives. Each sale copies these, so a change applies to new
 * sales only. The graphic shows the allowance: one solid slanted bar for
 * unlimited, one slanted segment for each visit or booking. The text beside it
 * is the fact.
 */
function BenefitsSection({ product, programs, manage }: { product: Product; programs: Schemas["ProgramListItem"][]; manage: boolean }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const programName = (id: string) => programs.find((program) => program.id === id)?.name ?? "A program";
  return (
    <Section
      id="benefits"
      title="Benefits"
      action={
        manage ? (
          <Link
            to="/$org/products/$productId/edit"
            params={{ org: organization.slug, productId: product.id }}
            className={buttonVariants({ variant: "secondary", size: "compact" })}
          >
            Edit benefits
          </Link>
        ) : null
      }
    >
      {product.benefits.length ? (
        <>
          <ListTable label="Benefits" density="two-line" className="list-table--bare product-benefits" columns={BENEFIT_COLUMNS}>
            <ListTableBody>
              {product.benefits.map((benefit) => {
                const iconName: IconName = benefit.kind === "gym_access" ? "checkIns" : "schedule";
                const scope = formatProgramScope(benefit, programName);
                return (
                  <ListTableRow key={benefit.id}>
                    <ListTableCell>
                      <CellStack
                        lead={
                          <Tile square>
                            <Icon name={iconName} size={16} {...icon} />
                          </Tile>
                        }
                        title={benefit.name}
                        sub={scope ?? undefined}
                      />
                    </ListTableCell>
                    <ListTableCell>
                      <span className="product-allowance">
                        <AllowanceBar limit={benefit.usage_limit} label={formatBenefitUsage(benefit)} />
                        <span>{formatBenefitUsage(benefit)}</span>
                      </span>
                    </ListTableCell>
                    <ListTableCell className="cell-muted">{locationName(benefit.location_id)}</ListTableCell>
                  </ListTableRow>
                );
              })}
            </ListTableBody>
          </ListTable>
          <p className="sale-note">Changes apply to new sales.</p>
        </>
      ) : (
        <Empty>No benefits</Empty>
      )}
    </Section>
  );
}

/* ---------- Details panel ---------- */

function ProductPanel({ product }: { product: Product }) {
  return (
    <PanelGroup title="Details">
      <PanelRows>
        <PanelRow label="Kind">
          <Icon name={PRODUCT_ICON[product.kind]} size={14} {...icon} />
          {PRODUCT_KIND_LABEL[product.kind]}
        </PanelRow>
        <PanelRow label="Visibility">
          <Icon name={product.published ? "gymSite" : "visibility"} size={14} {...icon} />
          {product.published ? "Gym site and desk" : "Staff only"}
        </PanelRow>
      </PanelRows>
    </PanelGroup>
  );
}

/* ---------- Loading and not found ---------- */

/** Keeps the page shape while the product loads. */
export function ProductLoading() {
  return (
    <DetailLayout record="product" className="product-details">
      <div role="status" aria-busy="true" aria-label="Loading the product" className="sale-loading">
        <header className="hero">
          <span className="tile tile--hero skeleton" />
          <div className="hero__text">
            <span className="skeleton sale-loading__title" />
            <span className="skeleton sale-loading__line" />
          </div>
        </header>
        <section className="member-section">
          <div className="member-section__head">
            <h2>Prices</h2>
          </div>
          <ListTable label="Prices (loading)" density="one-line" className="list-table--bare" columns={PRICE_COLUMNS}>
            <ListTableLoading rows={3} label="Loading prices" />
          </ListTable>
        </section>
      </div>
    </DetailLayout>
  );
}

/** One line and one action: back to the list, or Try again. */
export function ProductDidNotLoad({ notFound, message }: { notFound: boolean; message: string }) {
  const organization = useOrganization();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="page product-details">
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
