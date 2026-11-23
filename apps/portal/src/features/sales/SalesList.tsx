import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ListPager } from "../../components/ListPager";
import { SearchField, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { RecordBackdrop } from "@/components/parts/Backdrop";
import { HeroStats } from "@/components/parts/DetailLayout";
import { DisplayPopover, FilterBar } from "@/components/parts/FilterBar";
import {
  CellStack,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableEmpty,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { StatusMark, Tile } from "@/components/parts/marks";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE, pageRange, rangeLabel } from "../../lib/paging";
import type { Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActiveFilter, SortState } from "@/lib/list-parts";
import { saleMarks } from "../members/facts";
import {
  DEFAULT_SALE_COLUMNS,
  DEFAULT_SALE_SORT,
  SALE_SORT_FIELDS,
  activeFilters,
  factCounts,
  filterFromSearch,
  filterSales,
  isDefaultDisplay,
  paymentMethods,
  salesFilterFields,
  searchFromFilters,
  shortSaleDate,
  sortSales,
  type SaleColumnId,
  type SalesSearch,
} from "./facts";
import { METHOD_ICON, SaleAmount } from "./SaleFacts";

const icon = { "aria-hidden": true, focusable: false } as const;

/** Rails returns at most this many sales (Staff::SalesController), newest first. A full list may be missing older ones. */
const SALE_LIMIT = 100;

/**
 * The columns. Member and Product share the free space; the facts and the
 * amount have fixed widths. Date, Fulfillment, and Method follow the Display
 * popover. Method is empty for a sale with no payment.
 */
function saleColumns(columns: Record<SaleColumnId, boolean>): ListColumn[] {
  return [
    { id: "member", label: "Member", sortable: true },
    { id: "product", label: "Product" },
    ...(columns.date ? [{ id: "date", label: "Date", width: "112px", sortable: true }] : []),
    { id: "payment", label: "Payment", width: "112px" },
    ...(columns.fulfillment ? [{ id: "fulfillment", label: "Fulfillment", width: "128px" }] : []),
    ...(columns.method ? [{ id: "method", label: "Method", width: "148px" }] : []),
    { id: "amount", label: "Amount", width: "128px", align: "end" as const, sortable: true },
  ];
}

/**
 * The sales list (Paper "Members" pattern, with the Recent sales columns): the
 * title and the count, a filter bar with Payment and Fulfillment filters,
 * search, and Display, the list table, and the page range. Rails returns the
 * 100 newest sales; the list filters, sorts, and pages them here. The URL keeps
 * `payment`, `fulfillment`, and `q`.
 */
export function SalesList({ sales, search }: { sales: Result<Schemas["Sale"][]>; search: SalesSearch }) {
  const q = search.q ?? "";
  const filtered = Boolean(search.payment || search.fulfillment || q);
  return (
    <div className="page sales-list">
      <RecordBackdrop record="sale" />
      <ListHead count={sales.ok && !filtered ? countLabel(sales.data.length) : null} />
      {sales.ok ? (
        <Loaded sales={sales.data} search={search} />
      ) : (
        <>
          <Bar search={search} counts={null} />
          <ListTable label="Sales" columns={saleColumns(DEFAULT_SALE_COLUMNS)}>
            <FailureNotice error={sales.error} title="Sales did not load" />
          </ListTable>
        </>
      )}
    </div>
  );
}

function ListHead({ count }: { count: string | null }) {
  return (
    <header className="sales-head">
      <h1>Sales</h1>
      {count !== null ? <HeroStats stats={[{ value: count, label: "sales" }]} /> : null}
      <PageActions>
        <NewSaleLink shortcut />
      </PageActions>
    </header>
  );
}

/** `shortcut` adds the N key and its hint. Only the top bar action has it, so the key is bound once. */
function NewSaleLink({ variant = "default", shortcut = false }: { variant?: "default" | "secondary"; shortcut?: boolean }) {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const canCreate = can("purchases:create");
  useShortcut("n", () => void navigate({ to: "/$org/sales/new", params: { org: organization.slug } }), {
    enabled: shortcut && canCreate,
  });
  if (!canCreate) return null;
  return (
    <Link
      to="/$org/sales/new"
      params={{ org: organization.slug }}
      className={buttonVariants({ variant, size: "compact" })}
      aria-keyshortcuts={shortcut ? "N" : undefined}
    >
      New sale
      {shortcut ? <Kbd>N</Kbd> : null}
    </Link>
  );
}

/**
 * Filter, one chip per active filter, search, and Display. The chips change the
 * URL, so Back and reload keep them. Without counts (the list did not load) the
 * Filter button is left out.
 */
function Bar({ search, counts, display }: { search: SalesSearch; counts: ReturnType<typeof factCounts> | null; display?: ReactNode }) {
  const setSearch = useSetListSearch("/$org/sales", search, ["payment", "payment_not", "fulfillment", "fulfillment_not", "q"]);
  const filter = filterFromSearch(search);
  return (
    <FilterBar
      fields={counts ? salesFilterFields(counts) : []}
      filters={activeFilters(filter)}
      onChange={(next: ActiveFilter[]) => {
        const { payment, payment_not, fulfillment, fulfillment_not } = searchFromFilters(next, undefined);
        setSearch({ payment, payment_not, fulfillment, fulfillment_not });
      }}
      search={
        <SearchField
          id="sale-search"
          label="Search sales by member or product"
          placeholder="Search member or product"
          q={search.q ?? ""}
          onSearch={(q) => setSearch({ q: q || undefined })}
          delay={300}
        />
      }
      display={display}
    />
  );
}

function Loaded({ sales, search }: { sales: Schemas["Sale"][]; search: SalesSearch }) {
  const organization = useOrganization();
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  const [sort, setSort] = useState<SortState>(DEFAULT_SALE_SORT);
  const [columns, setColumns] = useState(DEFAULT_SALE_COLUMNS);
  const [chosenPage, setPage] = useState(1);
  // A new filter or search starts again at page 1.
  const key = `${filter.paymentNot ? "!" : ""}${filter.payment.join()}|${filter.fulfillmentNot ? "!" : ""}${filter.fulfillment.join()}|${q}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPage(1);
  }
  const requested = lastKey === key ? chosenPage : 1;
  const shown = useMemo(() => sortSales(filterSales(sales, filter, q), sort), [sales, key, sort]);
  const { from, to, pages } = pageRange(requested, PAGE_SIZE, shown.length);
  const page = Math.min(requested, pages);
  const rows = shown.slice(Math.max(from - 1, 0), to);
  const now = new Date();
  const set = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const display = (
    <DisplayPopover
      sortFields={SALE_SORT_FIELDS}
      sort={sort}
      onSort={set}
      columns={[
        { id: "date", label: "Date", on: columns.date },
        { id: "fulfillment", label: "Fulfillment", on: columns.fulfillment },
        { id: "method", label: "Method", on: columns.method },
      ]}
      onColumn={(id, on) => setColumns((current) => ({ ...current, [id as SaleColumnId]: on }))}
      isDefault={isDefaultDisplay(sort, columns)}
      onReset={() => {
        set(DEFAULT_SALE_SORT);
        setColumns(DEFAULT_SALE_COLUMNS);
      }}
    />
  );

  return (
    <>
      <Bar search={search} counts={factCounts(sales)} display={sales.length ? display : undefined} />
      <div className="sales-table-frame">
        <ListTable label="Sales" columns={saleColumns(columns)} sort={sort} onSort={set} className="sales-table">
          {rows.length ? (
            <ListTableBody>
              {rows.map((sale) => {
                const marks = saleMarks(sale);
                const methods = paymentMethods(sale);
                const methodIcon = sale.payments[0] ? METHOD_ICON[sale.payments[0].method] : null;
                return (
                  <ListTableRow key={sale.id}>
                    <ListTableCell className="sales-table__member">
                      <Link
                        to="/$org/sales/$saleId"
                        params={{ org: organization.slug, saleId: sale.id }}
                        className="list-table__link"
                      >
                        <CellStack lead={<Tile>{initials(sale.member.name)}</Tile>} title={sale.member.name} sub={sale.member.email} />
                      </Link>
                    </ListTableCell>
                    <ListTableCell className="sales-table__product">
                      <CellStack
                        title={
                          <>
                            {sale.line_item.product_name}
                            {sale.line_item.quantity > 1 ? ` × ${sale.line_item.quantity}` : ""}
                          </>
                        }
                        sub={`${sale.line_item.price_label}${sale.renewal ? " · Renewal" : ""}`}
                      />
                    </ListTableCell>
                    {columns.date ? (
                      <ListTableCell className="cell-muted sales-table__date">
                        <time dateTime={sale.purchased_at} suppressHydrationWarning>
                          {shortSaleDate(sale.purchased_at, organization.timezone, now)}
                        </time>
                      </ListTableCell>
                    ) : null}
                    <ListTableCell className="sales-table__payment">
                      <StatusMark kind={marks.payment.kind} tone={marks.payment.tone}>
                        {marks.payment.label}
                      </StatusMark>
                    </ListTableCell>
                    {columns.fulfillment ? (
                      <ListTableCell className="sales-table__fulfillment">
                        <StatusMark kind={marks.fulfillment.kind} tone={marks.fulfillment.tone}>
                          {marks.fulfillment.label}
                        </StatusMark>
                      </ListTableCell>
                    ) : null}
                    {columns.method ? (
                      <ListTableCell className="cell-muted sales-table__method">
                        <span className="sale-method-cell">
                          {methodIcon ? <Icon name={methodIcon} size={14} {...icon} /> : null}
                          <span title={methods ?? undefined}>{methods ?? "—"}</span>
                        </span>
                      </ListTableCell>
                    ) : null}
                    <ListTableCell align="end" className="sales-table__amount">
                      <SaleAmount sale={sale} />
                    </ListTableCell>
                  </ListTableRow>
                );
              })}
            </ListTableBody>
          ) : sales.length ? (
            <NoMatch q={q} filtered={Boolean(filter.payment.length || filter.fulfillment.length)} />
          ) : (
            <ListTableEmpty title="No sales yet" text="Desk sales and online purchases show up here." action={<NewSaleLink variant="secondary" />} />
          )}
        </ListTable>
      </div>
      {rows.length ? (
        <ListPager
          label="Sales pages"
          range={rangeLabel(page, PAGE_SIZE, shown.length, sales.length >= SALE_LIMIT ? "sales shown" : "sales")}
          page={page}
          pages={pages}
          onPage={setPage}
        />
      ) : null}
    </>
  );
}

function NoMatch({ q, filtered }: { q: string; filtered: boolean }) {
  const navigate = useNavigate();
  const organization = useOrganization();
  return (
    <ListTableEmpty
      title={q ? `No sales match “${q}”` : "No sales match these filters"}
      action={
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void navigate({ to: "/$org/sales", params: { org: organization.slug }, search: {}, replace: true })}
        >
          {q && !filtered ? "Clear search" : "Clear filters"}
        </Button>
      }
    />
  );
}

/** The sale count. At Rails' limit it reads "100+", because more may exist. */
function countLabel(count: number): string {
  return count >= SALE_LIMIT ? `${SALE_LIMIT}+` : String(count);
}

/** Keeps the list shape while sales load. */
export function SalesListLoading() {
  return (
    <div className="page sales-list">
      <RecordBackdrop record="sale" />
      <ListHead count={null} />
      <div className="filter-bar" aria-hidden="true">
        <span className="skeleton-block sales-list__skeleton-button" />
        <span className="filter-bar__space" />
        <span className="list-search skeleton-block" />
      </div>
      <div className="sales-table-frame">
        <ListTable label="Sales" columns={saleColumns(DEFAULT_SALE_COLUMNS)} className="sales-table">
          <ListTableLoading rows={8} label="Loading sales" />
        </ListTable>
      </div>
    </div>
  );
}
