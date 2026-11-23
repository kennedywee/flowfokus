import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
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
import { Dot, Tile, type DotTone } from "@/components/parts/marks";
import { FailureNotice, Kbd } from "../../components/ui";
import { PRODUCT_KIND_LABEL, formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE, pageRange, rangeLabel } from "../../lib/paging";
import type { Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ActiveFilter, SortState } from "@/lib/list-parts";
import {
  DEFAULT_PRODUCT_COLUMNS,
  DEFAULT_PRODUCT_SORT,
  PRODUCT_SORT_FIELDS,
  SALE_STATE_LABEL,
  activeFilters,
  filterFromSearch,
  filterProducts,
  isDefaultDisplay,
  mainPrice,
  offers,
  productCounts,
  productFilterFields,
  saleState,
  searchFromFilters,
  sortProducts,
  termsText,
  type Product,
  type ProductColumnId,
  type ProductsSearch,
  type SaleState,
} from "./facts";
import { PRODUCT_ICON } from "./kinds";

const icon = { "aria-hidden": true, focusable: false } as const;

/** The dot beside each status. The word is the fact; the dot repeats it. */
const STATE_TONE: Record<SaleState, DotTone> = { on_sale: "good", staff_only: "info", not_sold: "neutral" };

function productColumns(columns: Record<ProductColumnId, boolean>): ListColumn[] {
  return [
    { id: "name", label: "Product", sortable: true },
    ...(columns.type ? [{ id: "type", label: "Type", width: "112px" }] : []),
    { id: "status", label: "Status", width: "128px", sortable: true },
    { id: "price", label: "Price", width: "128px", align: "end" as const, sortable: true },
  ];
}

/**
 * The products list (the Members and Sales pattern): the title and the count,
 * a filter bar with Type and Status filters, search, and Display, the list
 * table, and the page range. Rails returns every product; the list filters,
 * sorts, and pages them here. Tickets are left out: they live on their program
 * page. The URL keeps `type`, `status`, and `q`.
 */
export function ProductsList({ products, search }: { products: Result<Product[]>; search: ProductsSearch }) {
  const can = useCan();
  const count = products.ok ? offers(products.data).length : null;
  return (
    <div className="page products-list">
      <RecordBackdrop record="product" />
      <ListHead count={count && !search.type && !search.status && !search.q ? String(count) : null} />
      {!can("products:read") ? (
        <ListTable label="Products" columns={productColumns(DEFAULT_PRODUCT_COLUMNS)}>
          <ListTableEmpty title="Your role cannot see products." text="An owner or manager can change your role." />
        </ListTable>
      ) : products.ok ? (
        <Loaded products={offers(products.data)} search={search} />
      ) : (
        <>
          <Bar search={search} counts={null} />
          <ListTable label="Products" columns={productColumns(DEFAULT_PRODUCT_COLUMNS)}>
            <DidNotLoad error={products.error} />
          </ListTable>
        </>
      )}
    </div>
  );
}

function ListHead({ count }: { count: string | null }) {
  return (
    <header className="products-head">
      <h1>Products</h1>
      {count !== null ? <HeroStats stats={[{ value: count, label: "products" }]} /> : null}
      <PageActions>
        <NewProductLink shortcut />
      </PageActions>
    </header>
  );
}

/** A new product needs a price, and adding a price needs products:update. The list needs products:read. `shortcut` adds the N key; only the top bar action has it. */
function NewProductLink({ variant = "default", shortcut = false }: { variant?: "default" | "secondary"; shortcut?: boolean }) {
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const allowed = can("products:read") && can("products:create") && can("products:update");
  useShortcut("n", () => void navigate({ to: "/$org/products/new", params: { org: organization.slug } }), { enabled: shortcut && allowed });
  if (!allowed) return null;
  return (
    <Link
      to="/$org/products/new"
      params={{ org: organization.slug }}
      className={buttonVariants({ variant, size: "compact" })}
      aria-keyshortcuts={shortcut ? "N" : undefined}
    >
      New product
      {shortcut ? <Kbd>N</Kbd> : null}
    </Link>
  );
}

/** Filter, one chip per active filter, search, and Display. The chips change the URL. Without counts the Filter button is left out. */
function Bar({ search, counts, display }: { search: ProductsSearch; counts: ReturnType<typeof productCounts> | null; display?: ReactNode }) {
  const setSearch = useSetListSearch("/$org/products", search, ["type", "type_not", "status", "status_not", "q"]);
  return (
    <FilterBar
      fields={counts ? productFilterFields(counts) : []}
      filters={activeFilters(filterFromSearch(search))}
      onChange={(next: ActiveFilter[]) => {
        const { type, type_not, status, status_not } = searchFromFilters(next);
        setSearch({ type, type_not, status, status_not });
      }}
      search={
        <SearchField
          id="product-search"
          label="Search products by name"
          placeholder="Search products"
          q={search.q ?? ""}
          onSearch={(q) => setSearch({ q: q || undefined })}
          delay={300}
        />
      }
      display={display}
    />
  );
}

function Loaded({ products, search }: { products: Product[]; search: ProductsSearch }) {
  const organization = useOrganization();
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  const [sort, setSort] = useState<SortState>(DEFAULT_PRODUCT_SORT);
  const [columns, setColumns] = useState(DEFAULT_PRODUCT_COLUMNS);
  const [chosenPage, setPage] = useState(1);
  // A new filter or search starts again at page 1.
  const key = `${filter.typeNot ? "!" : ""}${filter.type.join()}|${filter.statusNot ? "!" : ""}${filter.status.join()}|${q}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPage(1);
  }
  const requested = lastKey === key ? chosenPage : 1;
  const shown = useMemo(() => sortProducts(filterProducts(products, filter, q), sort), [products, key, sort]);
  const { from, to, pages } = pageRange(requested, PAGE_SIZE, shown.length);
  const page = Math.min(requested, pages);
  const rows = shown.slice(Math.max(from - 1, 0), to);
  const set = (next: SortState) => {
    setSort(next);
    setPage(1);
  };

  const display = (
    <DisplayPopover
      sortFields={PRODUCT_SORT_FIELDS}
      sort={sort}
      onSort={set}
      columns={[{ id: "type", label: "Type", on: columns.type }]}
      onColumn={(id, on) => setColumns((current) => ({ ...current, [id as ProductColumnId]: on }))}
      isDefault={isDefaultDisplay(sort, columns)}
      onReset={() => {
        set(DEFAULT_PRODUCT_SORT);
        setColumns(DEFAULT_PRODUCT_COLUMNS);
      }}
    />
  );

  return (
    <>
      <Bar search={search} counts={productCounts(products)} display={products.length ? display : undefined} />
      <div className="products-table-frame">
        <ListTable label="Products" columns={productColumns(columns)} sort={sort} onSort={set} className="products-table">
          {rows.length ? (
            <ListTableBody>
              {rows.map((product) => {
                const price = mainPrice(product);
                const state = saleState(product);
                return (
                  <ListTableRow key={product.id} className={state === "not_sold" ? "products-table__row--quiet" : undefined}>
                    <ListTableCell className="products-table__product">
                      <Link
                        to="/$org/products/$productId"
                        params={{ org: organization.slug, productId: product.id }}
                        className="list-table__link"
                      >
                        <CellStack
                          lead={
                            <Tile square>
                              <Icon name={PRODUCT_ICON[product.kind]} size={16} {...icon} />
                            </Tile>
                          }
                          title={product.name}
                          sub={termsText(product)}
                        />
                      </Link>
                    </ListTableCell>
                    {columns.type ? <ListTableCell className="cell-muted products-table__type">{PRODUCT_KIND_LABEL[product.kind]}</ListTableCell> : null}
                    <ListTableCell className="products-table__status">
                      <span className="products-status">
                        <Dot tone={STATE_TONE[state]} />
                        {SALE_STATE_LABEL[state]}
                      </span>
                    </ListTableCell>
                    <ListTableCell align="end" className="products-table__price">
                      {price ? formatMoney(price.amount_minor, price.currency) : "No price"}
                    </ListTableCell>
                  </ListTableRow>
                );
              })}
            </ListTableBody>
          ) : products.length ? (
            <NoMatch q={q} filtered={Boolean(filter.type.length || filter.status.length)} />
          ) : (
            <NoProducts />
          )}
        </ListTable>
      </div>
      {rows.length ? (
        <ListPager label="Product pages" range={rangeLabel(page, PAGE_SIZE, shown.length, "products")} page={page} pages={pages} onPage={setPage} />
      ) : null}
    </>
  );
}

function NoMatch({ q, filtered }: { q: string; filtered: boolean }) {
  const navigate = useNavigate();
  const organization = useOrganization();
  return (
    <ListTableEmpty
      title={q ? `No products match “${q}”` : "No products match these filters"}
      action={
        <Button
          type="button"
          variant="secondary"
          size="compact"
          onClick={() => void navigate({ to: "/$org/products", params: { org: organization.slug }, search: {}, replace: true })}
        >
          {q && !filtered ? "Clear search" : "Clear filters"}
        </Button>
      }
    />
  );
}

function NoProducts() {
  const can = useCan();
  const create = can("products:create") && can("products:update");
  return (
    <ListTableEmpty
      title="No products yet"
      text={create ? "Memberships and passes you add show up here." : "A manager adds products."}
      action={create ? <NewProductLink variant="secondary" /> : null}
    />
  );
}

function DidNotLoad({ error }: { error: Parameters<typeof FailureNotice>[0]["error"] }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="products-failure">
      <FailureNotice error={error} title="Products did not load" />
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
    </div>
  );
}

/** Keeps the list shape while products load. */
export function ProductsLoading() {
  return (
    <div className="page products-list">
      <RecordBackdrop record="product" />
      <ListHead count={null} />
      <div className="filter-bar" aria-hidden="true">
        <span className="skeleton-block products-list__skeleton-button" />
        <span className="filter-bar__space" />
        <span className="list-search skeleton-block" />
      </div>
      <div className="products-table-frame">
        <ListTable label="Products" columns={productColumns(DEFAULT_PRODUCT_COLUMNS)} className="products-table">
          <ListTableLoading rows={8} label="Loading products" />
        </ListTable>
      </div>
    </div>
  );
}
