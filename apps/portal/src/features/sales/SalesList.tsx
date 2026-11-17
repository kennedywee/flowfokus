import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ChevronRight, ListFilter, Plus, Receipt, Search, X } from "lucide-react";
import { ListPager } from "../../components/ListPager";
import { PageActions } from "../../components/PageActions";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import { formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE } from "../../lib/paging";
import type { Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

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
      <Plus {...icon} />
      New sale
    </Link>
  );
}

/** Updates the list URL. The URL holds filters and search, so Back and reload keep them. */
function useSetSearch(current: SalesSearch) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: Partial<SalesSearch>) => {
    const merged = { ...current, ...next };
    const clean: SalesSearch = {};
    if (merged.payment) clean.payment = merged.payment;
    if (merged.fulfillment) clean.fulfillment = merged.fulfillment;
    if (merged.q) clean.q = merged.q;
    void navigate({ to: "/$org/sales", params: { org: organization.slug }, search: clean, replace: true });
  };
}

function Toolbar({ sales, filter, search }: { sales: Schemas["Sale"][]; filter: SalesFilter; search: SalesSearch }) {
  const setSearch = useSetSearch(search);
  const counts = factCounts(sales);
  const toggle = (key: "payment" | "fulfillment", value: string, on: boolean) => {
    const values = new Set<string>(filter[key]);
    if (on) values.add(value);
    else values.delete(value);
    const allowed = (key === "payment" ? PAYMENT_FILTERS : FULFILLMENT_FILTERS).map((item) => item.value as string);
    setSearch({ [key]: allowed.filter((item) => values.has(item)).join(",") || undefined });
  };

  return (
    <div className="sales-toolbar">
      <div className="sales-toolbar__filters">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <ListFilter {...icon} />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sales-filter-menu">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Payment
                <DropdownMenuShortcut>
                  <ChevronRight {...icon} />
                </DropdownMenuShortcut>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="sales-filter-menu">
                {PAYMENT_FILTERS.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item.value}
                    checked={filter.payment.includes(item.value)}
                    onCheckedChange={(on) => toggle("payment", item.value, on)}
                  >
                    {item.label}
                    <DropdownMenuShortcut className="sales-filter-menu__count">{counts[item.value]}</DropdownMenuShortcut>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Fulfillment
                <DropdownMenuShortcut>
                  <ChevronRight {...icon} />
                </DropdownMenuShortcut>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="sales-filter-menu">
                {FULFILLMENT_FILTERS.map((item) => (
                  <DropdownMenuCheckboxItem
                    key={item.value}
                    checked={filter.fulfillment.includes(item.value)}
                    onCheckedChange={(on) => toggle("fulfillment", item.value, on)}
                  >
                    {item.label}
                    <DropdownMenuShortcut className="sales-filter-menu__count">{counts[item.value]}</DropdownMenuShortcut>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <FilterChip
          name="Payment"
          values={PAYMENT_FILTERS.filter((item) => filter.payment.includes(item.value)).map((item) => item.label)}
          onClear={() => setSearch({ payment: undefined })}
        />
        <FilterChip
          name="Fulfillment"
          values={FULFILLMENT_FILTERS.filter((item) => filter.fulfillment.includes(item.value)).map((item) => item.label)}
          onClear={() => setSearch({ fulfillment: undefined })}
        />
      </div>
      <SearchField q={search.q ?? ""} onSearch={(q) => setSearch({ q: q || undefined })} />
    </div>
  );
}

/** One active filter: "Payment is Unpaid, Part paid", and a button that clears it. */
function FilterChip({ name, values, onClear }: { name: string; values: string[]; onClear: () => void }) {
  if (!values.length) return null;
  return (
    <span className="filter-chip">
      <span className="filter-chip__part filter-chip__name">{name}</span>
      <span className="filter-chip__part filter-chip__op">{values.length > 1 ? "is any of" : "is"}</span>
      <span className="filter-chip__part filter-chip__values">{values.join(", ")}</span>
      <button type="button" className="filter-chip__clear" aria-label={`Clear the ${name.toLowerCase()} filter`} onClick={onClear}>
        <X {...icon} />
      </button>
    </span>
  );
}

/** Filters as staff type, after a short pause, and at once on Enter. "/" focuses it; Escape clears it. */
function SearchField({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(q);
  useShortcut("/", () => input.current?.focus());

  useEffect(() => {
    setValue((current) => (current.trim() === q ? current : q));
  }, [q]);

  const search = (next: string) => {
    if (next.trim() !== q) onSearch(next.trim());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => search(value), 250);
    return () => window.clearTimeout(timer);
    // Only typing restarts the pause.
  }, [value]);

  return (
    <form
      role="search"
      className="list-search sales-toolbar__search"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(value);
      }}
    >
      <label htmlFor="sale-search" className="visually-hidden">
        Search sales by member or item
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id="sale-search"
        className="list-search__input"
        type="search"
        placeholder="Search members or items"
        autoComplete="off"
        maxLength={200}
        aria-keyshortcuts="/"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            search("");
          }
        }}
      />
      <Kbd>/</Kbd>
    </form>
  );
}

function Results({ sales, filter, q }: { sales: Schemas["Sale"][]; filter: SalesFilter; q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const shown = filterSales(sales, filter, q);
  if (!sales.length) return <NoSales />;
  if (!shown.length) {
    return (
      <div className="list-state" role="status">
        <p>{q ? `No sales match “${q}”` : "No sales match these filters"}</p>
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void navigate({ to: "/$org/sales", params: { org: organization.slug }, search: {}, replace: true })}
        >
          {q && !filter.payment.length && !filter.fulfillment.length ? "Clear search" : "Clear filters"}
        </Button>
      </div>
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
      {/* Column titles for sighted staff. Each row link reads its own facts. */}
      <div className="sales-table__head sales-grid" aria-hidden="true">
        <span>Member</span>
        <span className="sales-col--wide">Item</span>
        <span className="sales-col--wide">Payment</span>
        <span className="sales-col--wide">Fulfillment</span>
        <span className="sales-col--num">Total</span>
        <span className="sales-col--num sales-col--wide">Date</span>
        <span />
      </div>
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
              <ChevronRight className="sales-row__chevron" {...icon} />
            </Link>
          </li>
        ))}
      </ul>
      <ListPager label="Sales pages" range={salesRange(first, rows.length, sales.length)} page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

function NoSales() {
  return (
    <div className="list-state">
      <Receipt className="list-state__icon" {...icon} />
      <p>No sales yet</p>
      <NewSaleLink variant="secondary" />
    </div>
  );
}

/** Keeps the list shape while sales load. */
export function SalesListLoading() {
  return (
    <div className="page sales-list" role="status" aria-busy="true" aria-label="Loading sales">
      <ListHead />
      <div className="sales-toolbar">
        <span className="sales-toolbar__filters">
          <span className="skeleton-block sales-skeleton__button" />
        </span>
        <span className="list-search sales-toolbar__search skeleton-block" />
      </div>
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
