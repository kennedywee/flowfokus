import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ListPager } from "../../components/ListPager";
import { FilterChips, FilterMenu, ListToolbar, ListToolbarLoading, SearchField, useSetListSearch, withCounts } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { FailureNotice, initials } from "../../components/ui";
import { formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE } from "../../lib/paging";
import type { Result } from "../../lib/result";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  FULFILLMENT_FILTERS,
  PAYMENT_FILTERS,
  factCounts,
  filterFromSearch,
  filterSales,
  salesRange,
  shortSaleDate,
  type SalesFilter,
  type SalesSearch,
} from "./facts";
import { FulfillmentMark, PaymentMark } from "./SaleFacts";

const icon = { "aria-hidden": true, focusable: false } as const;

/**
 * The sales list: filters and search, then one row per sale with the member,
 * the item, payment and fulfillment as separate facts, the total, and the date.
 * Rails returns every sale newest first; the list filters and pages here.
 */
export function SalesList({ sales, search }: { sales: Result<Schemas["Sale"][]>; search: SalesSearch }) {
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  return (
    <div className="page sales-list">
      <ListHead />
      {sales.ok ? (
        <>
          <Toolbar sales={sales.data} filter={filter} search={search} />
          <Results sales={sales.data} filter={filter} q={q} />
        </>
      ) : (
        <FailureNotice error={sales.error} title="Sales did not load" />
      )}
    </div>
  );
}

function ListHead() {
  return (
    <header className="sales-head">
      <h1>Sales</h1>
      <PageActions>
        <NewSaleLink />
      </PageActions>
    </header>
  );
}

function NewSaleLink({ variant = "default" }: { variant?: "default" | "secondary" }) {
  const organization = useOrganization();
  const can = useCan();
  if (!can("purchases:create")) return null;
  return (
    <Link to="/$org/sales/new" params={{ org: organization.slug }} className={buttonVariants({ variant, size: "compact" })}>
      <Icon name="plus" {...icon} />
      New sale
    </Link>
  );
}

function Toolbar({ sales, filter, search }: { sales: Schemas["Sale"][]; filter: SalesFilter; search: SalesSearch }) {
  const setSearch = useSetListSearch("/$org/sales", search, ["payment", "fulfillment", "q"]);
  const counts = factCounts(sales);
  const groups = [
    { key: "payment" as const, title: "Payment", options: withCounts(PAYMENT_FILTERS, counts), chosen: filter.payment },
    { key: "fulfillment" as const, title: "Fulfillment", options: withCounts(FULFILLMENT_FILTERS, counts), chosen: filter.fulfillment },
  ];
  return (
    <ListToolbar
      filter={<FilterMenu groups={groups} onChange={(key, values) => setSearch({ [key]: values.join(",") || undefined })} />}
      chips={<FilterChips groups={groups} onClear={(key) => setSearch({ [key]: undefined })} />}
      search={
        <SearchField
          id="sale-search"
          label="Search sales by member or item"
          placeholder="Search members or items"
          q={search.q ?? ""}
          onSearch={(q) => setSearch({ q: q || undefined })}
        />
      }
    />
  );
}

function Results({ sales, filter, q }: { sales: Schemas["Sale"][]; filter: SalesFilter; q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const shown = filterSales(sales, filter, q);
  if (!sales.length) return <NoSales />;
  if (!shown.length) {
    return (
      <TableState
        title={q ? `No sales match “${q}”` : "No sales match these filters"}
        action={
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => void navigate({ to: "/$org/sales", params: { org: organization.slug }, search: {}, replace: true })}
          >
            {q && !filter.payment.length && !filter.fulfillment.length ? "Clear search" : "Clear filters"}
          </Button>
        }
      />
    );
  }
  // A new filter starts again at page 1.
  return <SaleRows key={`${filter.payment.join()}|${filter.fulfillment.join()}|${q}`} sales={shown} />;
}

function SaleRows({ sales }: { sales: Schemas["Sale"][] }) {
  const organization = useOrganization();
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const first = (page - 1) * PAGE_SIZE;
  const rows = sales.slice(first, first + PAGE_SIZE);
  const now = new Date();

  return (
    <section className="sales-table" aria-label="Sales">
      <SalesHead />
      <ul className="sales-rows">
        {rows.map((sale) => (
          <li key={sale.id}>
            <Link
              to="/$org/sales/$saleId"
              params={{ org: organization.slug, saleId: sale.id }}
              className="sales-row sales-grid"
            >
              <span className="sales-row__member">
                <span className="sales-row__avatar" aria-hidden="true">
                  {initials(sale.member.name)}
                </span>
                <span className="sales-row__name">{sale.member.name}</span>
              </span>
              <span className="sales-row__item">
                {sale.line_item.product_name}
                {sale.line_item.quantity > 1 ? ` × ${sale.line_item.quantity}` : ""}
                <span className="sales-row__label"> · {sale.line_item.price_label}</span>
              </span>
              <PaymentMark sale={sale} className="sales-row__payment" />
              <FulfillmentMark sale={sale} className="sales-row__fulfillment" />
              <span className="sales-row__amount">
                <span className="sales-row__total" data-void={sale.voided_at ? true : undefined}>
                  {formatMoney(sale.total_minor, sale.currency)}
                </span>
                {!sale.voided_at && sale.balance_minor > 0 ? (
                  <span className="sales-row__due">{formatMoney(sale.balance_minor, sale.currency)} due</span>
                ) : sale.refunded_minor > 0 ? (
                  <span className="sales-row__due">{formatMoney(sale.refunded_minor, sale.currency)} refunded</span>
                ) : null}
              </span>
              <time className="sales-row__date" dateTime={sale.purchased_at} suppressHydrationWarning>
                {shortSaleDate(sale.purchased_at, organization.timezone, now)}
              </time>
              <Icon name="chevronRight" className="sales-row__chevron" {...icon} />
            </Link>
          </li>
        ))}
      </ul>
      <ListPager label="Sales pages" range={salesRange(first, rows.length, sales.length)} page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

/** Column titles for sighted staff. Each row link reads its own facts. */
function SalesHead() {
  return (
    <div className="sales-table__head sales-grid" aria-hidden="true">
      <span>Member</span>
      <span className="sales-col--wide">Item</span>
      <span className="sales-col--wide">Payment</span>
      <span className="sales-col--wide">Fulfillment</span>
      <span className="sales-col--num">Total</span>
      <span className="sales-col--num sales-col--wide">Date</span>
      <span />
    </div>
  );
}

function NoSales() {
  return (
    <TableState
      className="sales-table"
      head={<SalesHead />}
      title="No sales yet"
      text="Desk sales and online purchases show up here."
      action={<NewSaleLink variant="secondary" />}
    />
  );
}

/** Keeps the list shape while sales load. */
export function SalesListLoading() {
  return (
    <div className="page sales-list" role="status" aria-busy="true" aria-label="Loading sales">
      <ListHead />
      <ListToolbarLoading />
      <div className="sales-table">
        <div className="sales-table__head" />
        <div className="sales-rows">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="sales-row sales-skeleton__row">
              <span className="sales-row__avatar skeleton-block" />
              <span className="skeleton-line" style={{ width: `${32 - index * 2}%` }} />
              <span className="skeleton-line skeleton-line--small" style={{ width: `${22 - index}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
