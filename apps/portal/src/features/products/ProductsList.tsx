import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowDown, ChevronRight, ListFilter, Plus, Search, X } from "lucide-react";
import { ListPager } from "../../components/ListPager";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { Kbd } from "../../components/ui";
import { PRODUCT_KIND_LABEL, failureMessage, formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE } from "../../lib/paging";
import type { Failure, Result } from "../../lib/result";
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
  SALE_STATE_LABEL,
  STATUS_FILTERS,
  TYPE_FILTERS,
  filterFromSearch,
  filterProducts,
  mainPrice,
  offers,
  productCounts,
  productsRange,
  saleState,
  termsText,
  type Product,
  type ProductsFilter,
  type ProductsSearch,
} from "./facts";
import { PRODUCT_ICON } from "./kinds";

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * Paper "Products — list": Filter and search, a header band, then one row per
 * product with its type, terms, status, and the one price. Rails returns every
 * product; the list leaves out tickets, filters, and pages here.
 */
export function ProductsList({ products, search }: { products: Result<Product[]>; search: ProductsSearch }) {
  const can = useCan();
  if (!can("products:read")) {
    return (
      <div className="page programs-list products-list">
        <ListHead />
        <div className="list-state" role="status">
          <p className="list-state__title">Your role cannot see products.</p>
          <p className="list-state__text">An owner or manager can change your role.</p>
        </div>
      </div>
    );
  }
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  return (
    <div className="page programs-list products-list">
      <ListHead />
      {!products.ok ? (
        <DidNotLoad error={products.error} />
      ) : !offers(products.data).length ? (
        <NoProducts />
      ) : (
        <>
          <Toolbar products={products.data} filter={filter} search={search} />
          <Results products={products.data} filter={filter} q={q} />
        </>
      )}
    </div>
  );
}

function ListHead() {
  const organization = useOrganization();
  const can = useCan();
  return (
    <header className="programs-head">
      <h1>Products</h1>
      {can("products:create") ? (
        <PageActions>
          <Link to="/$org/products/new" params={{ org: organization.slug }} className={buttonVariants({ size: "compact" })}>
            <Plus {...icon} />
            New product
          </Link>
        </PageActions>
      ) : null}
    </header>
  );
}

function useSetSearch(current: ProductsSearch) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: Partial<ProductsSearch>) => {
    const merged = { ...current, ...next };
    const clean: ProductsSearch = {};
    if (merged.type) clean.type = merged.type;
    if (merged.status) clean.status = merged.status;
    if (merged.q) clean.q = merged.q;
    void navigate({ to: "/$org/products", params: { org: organization.slug }, search: clean, replace: true });
  };
}

function Toolbar({ products, filter, search }: { products: Product[]; filter: ProductsFilter; search: ProductsSearch }) {
  const setSearch = useSetSearch(search);
  const counts = productCounts(products);
  const toggle = (key: "type" | "status", value: string, on: boolean) => {
    const values = new Set<string>(filter[key]);
    if (on) values.add(value);
    else values.delete(value);
    const allowed = (key === "type" ? TYPE_FILTERS : STATUS_FILTERS).map((item) => item.value as string);
    setSearch({ [key]: allowed.filter((item) => values.has(item)).join(",") || undefined });
  };
  const groups = [
    { key: "type" as const, title: "Type", items: TYPE_FILTERS, chosen: filter.type as string[] },
    { key: "status" as const, title: "Status", items: STATUS_FILTERS, chosen: filter.status as string[] },
  ];

  return (
    <div className="programs-toolbar">
      <div className="programs-toolbar__filters">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <ListFilter {...icon} />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sales-filter-menu">
            {groups.map((group) => (
              <DropdownMenuSub key={group.key}>
                <DropdownMenuSubTrigger>
                  {group.title}
                  <DropdownMenuShortcut>
                    <ChevronRight {...icon} />
                  </DropdownMenuShortcut>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="sales-filter-menu">
                  {group.items.map((item) => (
                    <DropdownMenuCheckboxItem
                      key={item.value}
                      checked={group.chosen.includes(item.value)}
                      onCheckedChange={(on) => toggle(group.key, item.value, on)}
                    >
                      {item.label}
                      <DropdownMenuShortcut className="sales-filter-menu__count">{counts[item.value]}</DropdownMenuShortcut>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {groups.map((group) => {
          const values = group.items.filter((item) => group.chosen.includes(item.value)).map((item) => item.label);
          if (!values.length) return null;
          return (
            <span key={group.key} className="filter-chip">
              <span className="filter-chip__part filter-chip__name">{group.title}</span>
              <span className="filter-chip__part filter-chip__op">{values.length > 1 ? "is any of" : "is"}</span>
              <span className="filter-chip__part filter-chip__values">{values.join(", ")}</span>
              <button
                type="button"
                className="filter-chip__clear"
                aria-label={`Clear the ${group.title.toLowerCase()} filter`}
                onClick={() => setSearch({ [group.key]: undefined })}
              >
                <X {...icon} />
              </button>
            </span>
          );
        })}
      </div>
      <SearchField q={search.q ?? ""} onSearch={(q) => setSearch({ q: q || undefined })} />
    </div>
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
      className="list-search programs-toolbar__search"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(value);
      }}
    >
      <label htmlFor="product-search" className="visually-hidden">
        Search products by name
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id="product-search"
        className="list-search__input"
        type="search"
        placeholder="Search products"
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

function Results({ products, filter, q }: { products: Product[]; filter: ProductsFilter; q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const shown = filterProducts(products, filter, q);
  if (!shown.length) {
    const onlySearch = q && !filter.type.length && !filter.status.length;
    return (
      <TableState
        title={q ? `No products match “${q}”` : "No products match these filters"}
        action={
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => void navigate({ to: "/$org/products", params: { org: organization.slug }, search: {}, replace: true })}
          >
            {onlySearch ? "Clear search" : "Clear filters"}
          </Button>
        }
      />
    );
  }
  // A new filter starts again at page 1.
  return <ProductRows key={`${filter.type.join()}|${filter.status.join()}|${q}`} products={shown} />;
}

function ProductRows({ products }: { products: Product[] }) {
  const organization = useOrganization();
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const first = (page - 1) * PAGE_SIZE;
  const rows = products.slice(first, first + PAGE_SIZE);

  return (
    <section className="programs-table products-table" aria-label="Products">
      <ProductsHead />
      <ul className="programs-rows">
        {rows.map((product) => {
          const price = mainPrice(product);
          const state = saleState(product);
          return (
            <li key={product.id}>
              <Link
                to="/$org/products/$productId"
                params={{ org: organization.slug, productId: product.id }}
                className="programs-row products-row products-grid"
                data-state={state}
              >
                <span className="programs-row__program products-row__product">
                  <ProductIcon kind={product.kind} />
                  <span className="programs-row__text">
                    <span className="programs-row__name">{product.name}</span>
                    {/* Phones put the facts on line 2, as in "Phone — Products". */}
                    <span className="products-row__phone-line">
                      {PRODUCT_KIND_LABEL[product.kind]} · {termsText(product)} · {SALE_STATE_LABEL[state]}
                    </span>
                  </span>
                </span>
                <span className="products-row__fact products-col--wide">{PRODUCT_KIND_LABEL[product.kind]}</span>
                <span className="products-row__fact products-col--wide">{termsText(product)}</span>
                <span className="products-row__fact products-col--wide">{SALE_STATE_LABEL[state]}</span>
                <span className="products-row__price products-col--num">{price ? formatMoney(price.amount_minor, price.currency) : "No price"}</span>
                <ChevronRight className="programs-row__chevron" {...icon} />
              </Link>
            </li>
          );
        })}
      </ul>
      <ListPager label="Product pages" range={productsRange(first, rows.length, products.length)} page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

function ProductIcon({ kind }: { kind: Product["kind"] }) {
  const Icon = PRODUCT_ICON[kind];
  return <Icon className="products-row__icon" {...icon} />;
}

/** Column titles for sighted staff. Each row link reads its own facts. */
function ProductsHead() {
  return (
    <div className="programs-table__head products-grid" aria-hidden="true">
      <span className="programs-table__sort">
        Product
        <ArrowDown {...icon} />
      </span>
      <span className="products-col--wide">Type</span>
      <span className="products-col--wide">Terms</span>
      <span className="products-col--wide">Status</span>
      <span className="products-col--num">Price</span>
      <span />
    </div>
  );
}

function NoProducts() {
  const organization = useOrganization();
  const can = useCan();
  const create = can("products:create");
  return (
    <TableState
      className="programs-table products-table"
      head={<ProductsHead />}
      grid="products-grid"
      cells={["avatar", "text", "text", "text", "num", "blank"]}
      title="No products yet"
      text={create ? "Memberships and passes you add show up here." : "A manager adds products."}
      action={
        create ? (
          <Link to="/$org/products/new" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <Plus {...icon} />
            New product
          </Link>
        ) : null
      }
    />
  );
}

function DidNotLoad({ error }: { error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="list-state" role="alert">
      <p className="list-state__title">Products did not load.</p>
      <p className="list-state__text">{failureMessage(error)}</p>
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

/** Paper "Products — loading": the toolbar and the header band stay; four skeleton rows. */
export function ProductsLoading() {
  return (
    <div className="page programs-list products-list" role="status" aria-busy="true" aria-label="Loading products">
      <ListHead />
      <div className="programs-toolbar" aria-hidden="true">
        <span className="programs-toolbar__filters">
          <span className="skeleton-block programs-skeleton__button" />
        </span>
        <span className="list-search programs-toolbar__search skeleton-block" />
      </div>
      <div className="programs-table products-table" aria-hidden="true">
        <div className="programs-table__head products-grid">
          <span>Product</span>
          <span className="products-col--wide">Type</span>
          <span className="products-col--wide">Terms</span>
          <span className="products-col--wide">Status</span>
          <span className="products-col--num">Price</span>
          <span />
        </div>
        <div className="programs-rows">
          {[38, 30, 34, 26].map((width, index) => (
            <div key={index} className="programs-row programs-skeleton__row">
              <span className="programs-skeleton__text">
                <span className="skeleton-line" style={{ width: `${width}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
