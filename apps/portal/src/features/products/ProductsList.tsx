import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowDown, ChevronRight, Plus } from "lucide-react";
import { ListPager } from "../../components/ListPager";
import { FilterChips, FilterMenu, ListToolbar, ListToolbarLoading, SearchField, useSetListSearch, withCounts } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { PRODUCT_KIND_LABEL, failureMessage, formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { PAGE_SIZE } from "../../lib/paging";
import type { Failure, Result } from "../../lib/result";
import { Button, buttonVariants } from "@/components/ui/button";
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

function Toolbar({ products, filter, search }: { products: Product[]; filter: ProductsFilter; search: ProductsSearch }) {
  const setSearch = useSetListSearch("/$org/products", search, ["type", "status", "q"]);
  const counts = productCounts(products);
  const groups = [
    { key: "type" as const, title: "Type", options: withCounts(TYPE_FILTERS, counts), chosen: filter.type },
    { key: "status" as const, title: "Status", options: withCounts(STATUS_FILTERS, counts), chosen: filter.status },
  ];
  return (
    <ListToolbar
      filter={<FilterMenu groups={groups} onChange={(key, values) => setSearch({ [key]: values.join(",") || undefined })} />}
      chips={<FilterChips groups={groups} onClear={(key) => setSearch({ [key]: undefined })} />}
      search={
        <SearchField
          id="product-search"
          label="Search products by name"
          placeholder="Search products"
          q={search.q ?? ""}
          onSearch={(q) => setSearch({ q: q || undefined })}
        />
      }
    />
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
  // A new product needs a price, and adding a price needs products:update.
  const create = can("products:create") && can("products:update");
  return (
    <TableState
      className="programs-table products-table"
      head={<ProductsHead />}
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
      <ListToolbarLoading />
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
