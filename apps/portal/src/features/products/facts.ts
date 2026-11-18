import type { Schemas } from "@flowfokus/api";
import { PRODUCT_KIND_LABEL, currencyDigits, formatBenefitUsage, formatDuration, formatMoney, parseAmountToMinor } from "../../lib/format";
import { priceState } from "../programs/facts";

/*
 * Rules for the Products screens, kept apart from the screens so they can be
 * tested. Staff see one price per product, as in Paper. Underneath, Rails
 * keeps fixed prices: a new amount or length is a new price.
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

/* ---------- The one price ---------- */

/**
 * The price staff see. The first price on sale, in Rails order (amount, then
 * age). With none on sale, the first price that is off sale; then the first
 * archived price, so a product never shows without a price it had.
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

/**
 * Other prices staff must still see: not archived, and not the main price.
 * Real data can have several prices on sale for one product.
 */
export function otherPrices(product: Pick<Product, "prices">): Price[] {
  const main = mainPrice(product);
  return product.prices.filter((price) => price.id !== main?.id && priceState(price) !== "archived");
}

/** "30 days", or "Founding rate · 30 days" when staff named the price. */
export function priceName(price: Pick<Price, "label" | "duration_days">): string {
  const length = formatDuration(price.duration_days);
  return price.label === length ? length : `${price.label} · ${length}`;
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

/** The head line: "Membership · 30 days · RM 220.00". */
export function headFacts(product: Product): string {
  const price = mainPrice(product);
  return [
    PRODUCT_KIND_LABEL[product.kind],
    product.prices.length ? termsText(product) : "No price",
    price ? formatMoney(price.amount_minor, price.currency) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/* ---------- The list ---------- */

/** The list URL keeps the filters and the search, so Back and reload keep them. */
export interface ProductsSearch {
  type?: string;
  status?: string;
  q?: string;
}

export const TYPE_FILTERS: { value: ProductKind; label: string }[] = PRODUCT_KINDS.map((value) => ({ value, label: PRODUCT_KIND_LABEL[value] }));
export const STATUS_FILTERS: { value: SaleState; label: string }[] = (["on_sale", "staff_only", "not_sold"] as const).map((value) => ({
  value,
  label: SALE_STATE_LABEL[value],
}));

export interface ProductsFilter {
  type: ProductKind[];
  status: SaleState[];
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

export function readProductsSearch(search: Record<string, unknown>): ProductsSearch {
  const clean: ProductsSearch = {};
  const type = text(search.type, 100);
  const status = text(search.status, 100);
  const q = text(search.q, 200);
  if (type) clean.type = type;
  if (status) clean.status = status;
  if (q) clean.q = q;
  return clean;
}

function pick<T extends string>(value: string | undefined, allowed: readonly { value: T }[]): T[] {
  const wanted = new Set((value ?? "").split(","));
  return allowed.map((item) => item.value).filter((item) => wanted.has(item));
}

export function filterFromSearch(search: ProductsSearch): ProductsFilter {
  return { type: pick(search.type, TYPE_FILTERS), status: pick(search.status, STATUS_FILTERS) };
}

/** Products on sale first, then by name. Filters and the search narrow the list; the search matches the name. */
export function filterProducts(products: Product[], filter: ProductsFilter, q: string): Product[] {
  const needle = q.trim().toLocaleLowerCase();
  const rank: Record<SaleState, number> = { on_sale: 0, staff_only: 0, not_sold: 1 };
  return offers(products)
    .filter((product) => !filter.type.length || filter.type.includes(product.kind as ProductKind))
    .filter((product) => !filter.status.length || filter.status.includes(saleState(product)))
    .filter((product) => !needle || product.name.toLocaleLowerCase().includes(needle))
    .sort((a, b) => rank[saleState(a)] - rank[saleState(b)] || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
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

/** "1–7 of 7 products". */
export function productsRange(first: number, shown: number, total: number): string {
  if (total === 0) return "0 products";
  return `${first + 1}–${first + shown} of ${total} ${total === 1 ? "product" : "products"}`;
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
  const price = product ? mainPrice(product) : null;
  return {
    name: product?.name ?? "",
    kind: product?.kind === "pass" ? "pass" : "membership",
    amount: price ? (price.amount_minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency)) : "",
    days: String(price?.duration_days ?? 30),
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
export function checkDraft(draft: ProductDraft, currency: string): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = "Enter a name.";
  if (parseAmountToMinor(draft.amount, currency) === null) {
    errors.amount = currencyDigits(currency) > 0 ? "Enter a price, like 120.50." : "Enter a whole price, like 120.";
  }
  const days = draft.days.trim();
  if (!/^\d{1,4}$/.test(days) || Number(days) < 1 || Number(days) > MAX_DAYS) errors.days = `Enter 1 to ${MAX_DAYS} days.`;
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

/** The price Rails should sell from now on. */
export interface PriceSpec {
  label: string;
  amount_minor: number;
  duration_days: number;
}

/**
 * A price label names the length, such as "30 days". Staff never type it.
 * A label staff chose earlier stays, unless it named the old length.
 */
export function priceLabel(days: number, old?: Pick<Price, "label" | "duration_days"> | null): string {
  const named = formatDuration(days);
  if (!old || old.duration_days === null || old.label === formatDuration(old.duration_days)) return named;
  return old.duration_days === days ? old.label : named;
}

/** The new price, or null when the amount and the length are the same as the current price. */
export function priceChange(draft: ProductDraft, current: Price | null, currency: string): PriceSpec | null {
  const amount = parseAmountToMinor(draft.amount, currency);
  const days = Number(draft.days.trim());
  if (amount === null || !Number.isInteger(days)) return null;
  if (current && priceState(current) !== "archived" && current.amount_minor === amount && current.duration_days === days) return null;
  return { label: priceLabel(days, current), amount_minor: amount, duration_days: days };
}
