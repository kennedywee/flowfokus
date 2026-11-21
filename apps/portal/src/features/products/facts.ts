import type { Schemas } from "@flowfokus/api";
import type { FilterField } from "@/components/parts/FilterBar";
import type { ActiveFilter, SortState } from "@/lib/list-parts";
import { PRODUCT_KIND_LABEL, currencyDigits, formatBenefitUsage, formatDuration, formatMoney, parseAmountToMinor } from "../../lib/format";
import { priceState, type PriceState } from "../programs/facts";

/*
 * Rules for the Products screens, kept apart from the screens so they can be
 * tested. A product has many prices. Rails never changes a price a sale may
 * use, so a new amount or length is a new price; the old one is taken off
 * sale or archived.
 */

export type Product = Schemas["StaffProduct"];
type Price = Schemas["Price"];

/** Product kinds Products shows and creates. Tickets live on their program page. */
export type ProductKind = "membership" | "pass";

export const PRODUCT_KINDS: ProductKind[] = ["membership", "pass"];

/** Products as the list shows them: memberships and passes. */
export function offers(products: Product[]): Product[] {
  return products.filter((product) => product.kind !== "ticket");
}

/* ---------- Prices ---------- */

/**
 * The price the list and Sell use. The first price on sale, in Rails order
 * (amount, then age). With none on sale, the first price that is off sale;
 * then the first archived price, so a product never shows without a price it had.
 */
export function mainPrice(product: Pick<Product, "prices">): Price | null {
  const { prices } = product;
  return (
    prices.find((price) => priceState(price) === "on_sale") ??
    prices.find((price) => priceState(price) === "off_sale") ??
    prices[0] ??
    null
  );
}

/** The Status column of the Prices table. */
export const PRICE_STATUS_LABEL: Record<PriceState, string> = { on_sale: "On sale", off_sale: "Not on sale", archived: "Archived" };

/** Prices on sale first, then not on sale, then archived. Within a status the Rails order stays. */
export function sortedPrices(product: Pick<Product, "prices">): Price[] {
  const rank: Record<PriceState, number> = { on_sale: 0, off_sale: 1, archived: 2 };
  return product.prices.map((price, index) => ({ price, index })).sort((a, b) => rank[priceState(a.price)] - rank[priceState(b.price)] || a.index - b.index).map(({ price }) => price);
}

/* ---------- Sale state ---------- */

/** On sale (published on the gym site), Staff only (on sale at the desk), or Not sold (no price on sale). */
export type SaleState = "on_sale" | "staff_only" | "not_sold";

export const SALE_STATE_LABEL: Record<SaleState, string> = { on_sale: "On sale", staff_only: "Staff only", not_sold: "Not sold" };

export function saleState(product: Pick<Product, "published" | "prices">): SaleState {
  if (!product.prices.some((price) => priceState(price) === "on_sale")) return "not_sold";
  return product.published ? "on_sale" : "staff_only";
}

/* ---------- Terms ---------- */

/** The bookings or visits a pass gives: its first benefit with a limit. */
export function passUses(product: Pick<Product, "kind" | "benefits">): Schemas["Benefit"] | null {
  if (product.kind !== "pass") return null;
  return product.benefits.find((benefit) => benefit.usage_limit !== null) ?? null;
}

/** "30 days", or for a pass "10 bookings · 60 days". */
export function termsText(product: Pick<Product, "kind" | "benefits" | "prices">): string {
  const price = mainPrice(product);
  const uses = passUses(product);
  return [uses ? formatBenefitUsage(uses) : null, price ? formatDuration(price.duration_days) : null].filter(Boolean).join(" · ") || "No price";
}

/* ---------- The list ---------- */

/**
 * The list URL keeps the filters and the search, so Back and reload keep them.
 * `type_not` and `status_not` turn a filter into "is not"; without them the
 * values mean "is any of", as in older links.
 */
export interface ProductsSearch {
  type?: string;
  type_not?: true;
  status?: string;
  status_not?: true;
  q?: string;
}

export const TYPE_FILTERS: { value: ProductKind; label: string }[] = PRODUCT_KINDS.map((value) => ({ value, label: PRODUCT_KIND_LABEL[value] }));
export const STATUS_FILTERS: { value: SaleState; label: string }[] = (["on_sale", "staff_only", "not_sold"] as const).map((value) => ({
  value,
  label: SALE_STATE_LABEL[value],
}));

export interface ProductsFilter {
  type: ProductKind[];
  typeNot: boolean;
  status: SaleState[];
  statusNot: boolean;
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

function pick<T extends string>(value: string | undefined, allowed: readonly { value: T }[]): T[] {
  const wanted = new Set((value ?? "").split(","));
  return allowed.map((item) => item.value).filter((item) => wanted.has(item));
}

/** `_not` counts only when its filter has values. The router reads `true` as a boolean. */
function negation(flag: unknown, values: readonly string[]): boolean {
  return values.length > 0 && (flag === true || flag === "true" || flag === "1" || flag === 1);
}

export function readProductsSearch(search: Record<string, unknown>): ProductsSearch {
  const clean: ProductsSearch = {};
  const type = pick(text(search.type, 100), TYPE_FILTERS);
  const status = pick(text(search.status, 100), STATUS_FILTERS);
  const q = text(search.q, 200);
  if (type.length) clean.type = type.join(",");
  if (negation(search.type_not, type)) clean.type_not = true;
  if (status.length) clean.status = status.join(",");
  if (negation(search.status_not, status)) clean.status_not = true;
  if (q) clean.q = q;
  return clean;
}

export function filterFromSearch(search: ProductsSearch): ProductsFilter {
  const type = pick(search.type, TYPE_FILTERS);
  const status = pick(search.status, STATUS_FILTERS);
  return { type, typeNot: negation(search.type_not, type), status, statusNot: negation(search.status_not, status) };
}

/** The chips for the filters in the URL, type first. */
export function activeFilters(filter: ProductsFilter): ActiveFilter[] {
  return [
    ...(filter.type.length ? [{ field: "type", values: filter.type, negated: filter.typeNot }] : []),
    ...(filter.status.length ? [{ field: "status", values: filter.status, negated: filter.statusNot }] : []),
  ];
}

/** The URL search for the chips. A flipped chip keeps its values and sets `_not`. */
export function searchFromFilters(filters: readonly ActiveFilter[]): Pick<ProductsSearch, "type" | "type_not" | "status" | "status_not"> {
  const type = filters.find((filter) => filter.field === "type");
  const status = filters.find((filter) => filter.field === "status");
  return {
    ...(type?.values.length ? { type: type.values.join(",") } : {}),
    ...(type?.values.length && type.negated ? { type_not: true as const } : {}),
    ...(status?.values.length ? { status: status.values.join(",") } : {}),
    ...(status?.values.length && status.negated ? { status_not: true as const } : {}),
  };
}

/** The filter fields the bar offers, with a count per value. */
export function productFilterFields(counts: Record<ProductKind | SaleState, number>): FilterField[] {
  return [
    { key: "type", label: "Type", options: TYPE_FILTERS.map((item) => ({ ...item, count: counts[item.value] })) },
    { key: "status", label: "Status", options: STATUS_FILTERS.map((item) => ({ ...item, count: counts[item.value] })) },
  ];
}

/** Products that match every chosen fact; the search matches the name. */
export function filterProducts(products: Product[], filter: ProductsFilter, q: string): Product[] {
  const needle = q.trim().toLocaleLowerCase();
  return offers(products)
    .filter((product) => !filter.type.length || filter.type.includes(product.kind as ProductKind) !== filter.typeNot)
    .filter((product) => !filter.status.length || filter.status.includes(saleState(product)) !== filter.statusNot)
    .filter((product) => !needle || product.name.toLocaleLowerCase().includes(needle));
}

/** How many products have each type and each status, for the Filter menu. */
export function productCounts(products: Product[]): Record<ProductKind | SaleState, number> {
  const counts: Record<ProductKind | SaleState, number> = { membership: 0, pass: 0, on_sale: 0, staff_only: 0, not_sold: 0 };
  for (const product of offers(products)) {
    counts[product.kind as ProductKind] += 1;
    counts[saleState(product)] += 1;
  }
  return counts;
}

/* ---------- Display: sort and columns ---------- */

export const PRODUCT_SORT_FIELDS = [
  { value: "status", label: "Status" },
  { value: "name", label: "Name" },
  { value: "price", label: "Price" },
] as const;

/** On sale first, then by name: the order the list always had. */
export const DEFAULT_PRODUCT_SORT: SortState = { column: "status", direction: "asc" };

/** The Display popover's column chips. Product, Status, and Price always show. */
export type ProductColumnId = "type";
export const DEFAULT_PRODUCT_COLUMNS: Record<ProductColumnId, boolean> = { type: true };

export function isDefaultDisplay(sort: SortState, columns: Record<ProductColumnId, boolean>): boolean {
  return sort.column === DEFAULT_PRODUCT_SORT.column && sort.direction === DEFAULT_PRODUCT_SORT.direction && columns.type === DEFAULT_PRODUCT_COLUMNS.type;
}

/** The products in the chosen order. A tie falls back to the name. */
export function sortProducts(products: readonly Product[], sort: SortState): Product[] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const rank: Record<SaleState, number> = { on_sale: 0, staff_only: 0, not_sold: 1 };
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const compare = (a: Product, b: Product) => {
    if (sort.column === "name") return byName(a, b);
    if (sort.column === "price") return (mainPrice(a)?.amount_minor ?? -1) - (mainPrice(b)?.amount_minor ?? -1);
    return rank[saleState(a)] - rank[saleState(b)];
  };
  return [...products].sort((a, b) => sign * compare(a, b) || byName(a, b));
}

/* ---------- The form ---------- */

/** Which programs a program benefit covers: every program, one kind, or a picked list. */
export type Scope = "all" | Schemas["ProgramKind"] | "selected";

export interface BenefitDraft {
  key: number;
  kind: Schemas["BenefitKind"];
  name: string;
  usage: string;
  locationId: string;
  scope: Scope;
  programIds: string[];
}

export interface ProductDraft {
  name: string;
  kind: ProductKind;
  amount: string;
  days: string;
  published: boolean;
  description: string;
  benefits: BenefitDraft[];
}

let nextKey = 1;

export function benefitDraft(benefit?: Schemas["Benefit"]): BenefitDraft {
  return {
    key: nextKey++,
    kind: benefit?.kind ?? "gym_access",
    name: benefit?.name ?? "Gym access",
    usage: benefit?.usage_limit ? String(benefit.usage_limit) : "",
    locationId: benefit?.location_id ?? "",
    scope: benefit?.program_ids.length ? "selected" : (benefit?.program_kind ?? "all"),
    programIds: benefit?.program_ids ?? [],
  };
}

/** A new pass starts with ten group-class bookings; a new membership with gym access. */
export function startBenefits(kind: ProductKind): BenefitDraft[] {
  if (kind === "membership") return [benefitDraft()];
  return [{ ...benefitDraft(), kind: "program_access", name: "Group classes", usage: "10", scope: "group_class" }];
}

/** The form's first values: the product's, or a new membership. */
export function startDraft(product: Product | undefined, currency: string): ProductDraft {
  return {
    name: product?.name ?? "",
    kind: product?.kind === "pass" ? "pass" : "membership",
    // Prices are set on a new product and added on the product page.
    amount: "",
    days: "30",
    published: product?.published ?? false,
    description: product?.description ?? "",
    benefits: product?.benefits.length ? product.benefits.map(benefitDraft) : startBenefits("membership"),
  };
}

export type DraftErrors = Partial<Record<"name" | "amount" | "days" | "benefits", string>> & {
  /** Errors per benefit, by key. */
  benefit?: Record<number, Partial<Record<"name" | "usage" | "programs", string>>>;
};

export const MAX_DAYS = 3660;
export const MAX_BENEFITS = 10;

/** Checks the draft before anything is sent. Rails checks again. */
export function checkDraft(draft: ProductDraft, currency: string, options: { price?: boolean } = {}): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = "Enter a name.";
  if (options.price !== false) Object.assign(errors, checkPrice(draft.amount, draft.days, currency));
  if (!draft.benefits.length) errors.benefits = "Add at least one benefit.";
  const benefit: NonNullable<DraftErrors["benefit"]> = {};
  for (const item of draft.benefits) {
    const found: Partial<Record<"name" | "usage" | "programs", string>> = {};
    if (!item.name.trim()) found.name = "Enter a name.";
    if (item.usage.trim() && !/^[1-9]\d{0,5}$/.test(item.usage.trim())) found.usage = "Enter a whole number, or leave empty for unlimited.";
    if (item.kind === "program_access" && item.scope === "selected" && !item.programIds.length) found.programs = "Pick at least one program.";
    if (Object.keys(found).length) benefit[item.key] = found;
  }
  if (Object.keys(benefit).length) errors.benefit = benefit;
  return errors;
}

/** The amount and length of a price, checked before anything is sent. Rails checks again. */
export function checkPrice(amount: string, days: string, currency: string): Partial<Record<"amount" | "days", string>> {
  const errors: Partial<Record<"amount" | "days", string>> = {};
  if (parseAmountToMinor(amount, currency) === null) {
    errors.amount = currencyDigits(currency) > 0 ? "Enter a price, like 120.50." : "Enter a whole price, like 120.";
  }
  const length = days.trim();
  if (!/^\d{1,4}$/.test(length) || Number(length) < 1 || Number(length) > MAX_DAYS) errors.days = `Enter 1 to ${MAX_DAYS} days.`;
  return errors;
}

export function hasErrors(errors: DraftErrors): boolean {
  return Boolean(errors.name || errors.amount || errors.days || errors.benefits || errors.benefit);
}

/** The fields Rails takes for a product: name, note, gym site, and benefits. */
export function productFields(draft: ProductDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    published: draft.published,
    benefits: draft.benefits.map((benefit) => {
      const program = benefit.kind === "program_access";
      return {
        kind: benefit.kind,
        name: benefit.name.trim(),
        usage_limit: benefit.usage.trim() ? Number(benefit.usage.trim()) : null,
        location_id: benefit.locationId || null,
        program_ids: program && benefit.scope === "selected" ? benefit.programIds : [],
        program_kind: program && benefit.scope !== "all" && benefit.scope !== "selected" ? benefit.scope : null,
      };
    }),
  };
}

/** Did staff change anything? Benefit keys are ignored. */
export function draftChanged(draft: ProductDraft, start: ProductDraft): boolean {
  const plain = (value: ProductDraft) => JSON.stringify({ ...value, benefits: value.benefits.map(({ key: _key, ...rest }) => rest) });
  return plain(draft) !== plain(start);
}

/** A price as Rails takes it. */
export interface PriceSpec {
  label: string;
  amount_minor: number;
  duration_days: number;
}

/** A price label names the length, such as "30 days". Staff never type it. */
export function priceLabel(days: number): string {
  return formatDuration(days);
}

/** The price an amount and a length make, or null when either is not valid. */
export function priceSpec(amount: string, days: string, currency: string): PriceSpec | null {
  const minor = parseAmountToMinor(amount, currency);
  const length = Number(days.trim());
  if (minor === null || !Number.isInteger(length)) return null;
  return { label: priceLabel(length), amount_minor: minor, duration_days: length };
}
