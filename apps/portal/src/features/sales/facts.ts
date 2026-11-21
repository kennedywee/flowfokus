import type { Permission, Schemas } from "@flowfokus/api";
import type { FilterField } from "@/components/parts/FilterBar";
import { matchesFilter, type ActiveFilter, type SortState } from "@/lib/list-parts";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatMoney, formatTime } from "../../lib/format";

/*
 * Facts about a sale, read from Rails responses only. Payment and fulfillment
 * are separate facts: a paid sale is not a fulfilled sale. The sales list,
 * the sale page, and the member page all use these.
 */

export type PaymentState = "paid" | "partial" | "unpaid" | "void";
export type PaymentFact = { state: PaymentState; label: string };

/** The payment state of a sale, from `payment_status` and `voided_at`. */
export function paymentFact(sale: Schemas["Sale"]): PaymentFact {
  if (sale.voided_at || sale.payment_status === "void") return { state: "void", label: PAYMENT_STATUS_LABEL.void };
  if (sale.payment_status === "paid") return { state: "paid", label: PAYMENT_STATUS_LABEL.paid };
  if (sale.payment_status === "partially_paid") return { state: "partial", label: PAYMENT_STATUS_LABEL.partially_paid };
  return { state: "unpaid", label: PAYMENT_STATUS_LABEL.unpaid };
}

export type FulfillmentState = "fulfilled" | "revoked" | "waiting" | "none";
export type FulfillmentFact = { state: FulfillmentState; label: string };

/** The fulfillment state of a sale, from `fulfilled` and the fulfillment record. */
export function fulfillmentFact(sale: Schemas["Sale"]): FulfillmentFact {
  if (sale.fulfillment?.revoked_at) return { state: "revoked", label: "Access revoked" };
  if (sale.fulfilled) return { state: "fulfilled", label: "Fulfilled" };
  if (sale.voided_at) return { state: "none", label: "Unfulfilled" };
  return { state: "waiting", label: "Unfulfilled" };
}

/** How the sale was paid: each method once, oldest first. Null when nothing was paid. */
export function paymentMethods(sale: Schemas["Sale"]): string | null {
  const methods = [...new Set(sale.payments.map((payment) => PAYMENT_METHOD_LABEL[payment.method]))];
  return methods.length ? methods.join(" + ") : null;
}

/* ---------- List filters ---------- */

export const PAYMENT_FILTERS: { value: PaymentState; label: string }[] = [
  { value: "unpaid", label: PAYMENT_STATUS_LABEL.unpaid },
  { value: "partial", label: PAYMENT_STATUS_LABEL.partially_paid },
  { value: "paid", label: PAYMENT_STATUS_LABEL.paid },
  { value: "void", label: PAYMENT_STATUS_LABEL.void },
];

/** Void sales are never fulfilled, so "Unfulfilled" leaves them out. */
export const FULFILLMENT_FILTERS: { value: Exclude<FulfillmentState, "none">; label: string }[] = [
  { value: "waiting", label: "Unfulfilled" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "revoked", label: "Access revoked" },
];

export interface SalesFilter {
  payment: PaymentState[];
  fulfillment: FulfillmentState[];
}

/** The search params the sales list keeps in the URL. */
export interface SalesSearch {
  payment?: string;
  fulfillment?: string;
  q?: string;
}

function pick<T extends string>(text: unknown, allowed: readonly T[]): T[] {
  if (typeof text !== "string") return [];
  const wanted = new Set(text.split(","));
  return allowed.filter((value) => wanted.has(value));
}

/**
 * Older param values that still work: the param was once `delivery`, and its
 * "delivered" value is now "fulfilled".
 */
function legacyFulfillment(text: unknown): unknown {
  if (typeof text !== "string") return text;
  return text
    .split(",")
    .map((value) => (value === "delivered" ? "fulfilled" : value))
    .join(",");
}

/**
 * Reads the list URL. Older links use `view=due` (money still due),
 * `view=deliver` (paid, unfulfilled), and `delivery=` for the fulfillment
 * filter; they become the same filters.
 */
export function readSalesSearch(search: Record<string, unknown>): SalesSearch {
  let payment = pick(search.payment, PAYMENT_FILTERS.map((item) => item.value));
  let fulfillment = pick(search.fulfillment ?? legacyFulfillment(search.delivery), FULFILLMENT_FILTERS.map((item) => item.value));
  if (search.view === "due" && !payment.length) payment = ["unpaid", "partial"];
  if (search.view === "deliver" && !payment.length && !fulfillment.length) {
    payment = ["paid"];
    fulfillment = ["waiting"];
  }
  const q = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  return {
    ...(payment.length ? { payment: payment.join(",") } : {}),
    ...(fulfillment.length ? { fulfillment: fulfillment.join(",") } : {}),
    ...(q ? { q } : {}),
  };
}

export function filterFromSearch(search: SalesSearch): SalesFilter {
  return {
    payment: pick(search.payment, PAYMENT_FILTERS.map((item) => item.value)),
    fulfillment: pick(search.fulfillment, FULFILLMENT_FILTERS.map((item) => item.value)),
  };
}

/** Sales that match every chosen fact. Within one fact, any chosen value matches. */
export function filterSales(sales: Schemas["Sale"][], filter: SalesFilter, q = ""): Schemas["Sale"][] {
  const needle = q.trim().toLowerCase();
  return sales.filter((sale) => {
    if (filter.payment.length && !filter.payment.includes(paymentFact(sale).state)) return false;
    if (filter.fulfillment.length && !filter.fulfillment.includes(fulfillmentFact(sale).state)) return false;
    if (!needle) return true;
    return [sale.member.name, sale.member.email, sale.line_item.product_name, sale.line_item.price_label].some((text) =>
      text.toLowerCase().includes(needle),
    );
  });
}

/** How many sales have each payment and fulfillment state. */
export function factCounts(sales: Schemas["Sale"][]): Record<PaymentState | FulfillmentState, number> {
  const counts = { paid: 0, partial: 0, unpaid: 0, void: 0, fulfilled: 0, revoked: 0, waiting: 0, none: 0 };
  for (const sale of sales) {
    counts[paymentFact(sale).state] += 1;
    counts[fulfillmentFact(sale).state] += 1;
  }
  return counts;
}

/** The filter fields the bar offers, with a count per value. */
export function salesFilterFields(counts: Record<PaymentState | FulfillmentState, number>): FilterField[] {
  return [
    { key: "payment", label: "Payment", options: PAYMENT_FILTERS.map((item) => ({ ...item, count: counts[item.value] })) },
    { key: "fulfillment", label: "Fulfillment", options: FULFILLMENT_FILTERS.map((item) => ({ ...item, count: counts[item.value] })) },
  ];
}

/** The chips for the filters in the URL, payment first. */
export function activeFilters(filter: SalesFilter): ActiveFilter[] {
  return [
    ...(filter.payment.length ? [{ field: "payment", values: filter.payment }] : []),
    ...(filter.fulfillment.length ? [{ field: "fulfillment", values: filter.fulfillment }] : []),
  ];
}

/**
 * The URL search for the chips. The URL holds only "is any of" lists, so a chip
 * flipped to "is not" becomes the values it leaves in. A chip that leaves
 * nothing in has no values and stays out.
 */
export function searchFromFilters(filters: readonly ActiveFilter[], q: string | undefined): SalesSearch {
  const values = (field: string, all: readonly string[]) => {
    const chip = filters.find((filter) => filter.field === field);
    if (!chip) return [];
    return all.filter((value) => matchesFilter(chip, value));
  };
  const payment = values("payment", PAYMENT_FILTERS.map((item) => item.value));
  const fulfillment = values("fulfillment", FULFILLMENT_FILTERS.map((item) => item.value));
  return {
    ...(payment.length ? { payment: payment.join(",") } : {}),
    ...(fulfillment.length ? { fulfillment: fulfillment.join(",") } : {}),
    ...(q ? { q } : {}),
  };
}

/* ---------- Display: sort and columns ---------- */

/** The columns staff can sort by. The ids are the list table's column ids. */
export const SALE_SORT_FIELDS = [
  { value: "date", label: "Date" },
  { value: "member", label: "Member" },
  { value: "amount", label: "Amount" },
] as const;

/** Rails returns sales newest first, so that is the order staff see until they sort. */
export const DEFAULT_SALE_SORT: SortState = { column: "date", direction: "desc" };

/** The Display popover's column chips. Member, Product, Payment, and Amount always show. */
export type SaleColumnId = "date" | "fulfillment" | "method";
export const DEFAULT_SALE_COLUMNS: Record<SaleColumnId, boolean> = { date: true, fulfillment: true, method: true };

/** The sales in the chosen order. A tie keeps the order Rails sent. */
export function sortSales(sales: readonly Schemas["Sale"][], sort: SortState): Schemas["Sale"][] {
  const sign = sort.direction === "asc" ? 1 : -1;
  const compare = (a: Schemas["Sale"], b: Schemas["Sale"]) => {
    if (sort.column === "member") return a.member.name.localeCompare(b.member.name, undefined, { sensitivity: "base" });
    if (sort.column === "amount") return a.total_minor - b.total_minor;
    return Date.parse(a.purchased_at) - Date.parse(b.purchased_at);
  };
  return sales
    .map((sale, index) => ({ sale, index }))
    .sort((a, b) => sign * compare(a.sale, b.sale) || a.index - b.index)
    .map(({ sale }) => sale);
}

/** True when sort and columns are what the page starts with. Reset to default then does nothing. */
export function isDefaultDisplay(sort: SortState, columns: Record<SaleColumnId, boolean>): boolean {
  return (
    sort.column === DEFAULT_SALE_SORT.column &&
    sort.direction === DEFAULT_SALE_SORT.direction &&
    (Object.keys(DEFAULT_SALE_COLUMNS) as SaleColumnId[]).every((id) => columns[id] === DEFAULT_SALE_COLUMNS[id])
  );
}

/* ---------- Dates ---------- */

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(date);
}

/**
 * A short sale date: "Today 9:40 am", "Yesterday 7:20 pm", "2 Nov", or
 * "2 Nov 2025" outside this year. Uses the organization's time zone.
 */
export function shortSaleDate(iso: string, timeZone: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const day = dayKey(date, timeZone);
  if (day === dayKey(now, timeZone)) return `Today ${formatTime(iso, timeZone)}`;
  if (day === dayKey(new Date(now.getTime() - 86_400_000), timeZone)) return `Yesterday ${formatTime(iso, timeZone)}`;
  const year = (value: Date) => new Intl.DateTimeFormat("en-MY", { timeZone, year: "numeric" }).format(value);
  return new Intl.DateTimeFormat("en-MY", {
    timeZone,
    day: "numeric",
    month: "short",
    ...(year(date) === year(now) ? {} : { year: "numeric" }),
  }).format(date);
}

/* ---------- Actions ---------- */

/** Payments with money left to refund. */
export function refundablePayments(sale: Schemas["Sale"]): Schemas["Payment"][] {
  return sale.payments.filter((payment) => payment.amount_minor > payment.refunded_minor);
}

export type FulfillAction = "ready" | "early" | "blocked";

export interface SaleActions {
  pay: boolean;
  /** "ready" when paid in full, "early" when staff may fulfill before payment, "blocked" otherwise. Null when fulfillment is done or not allowed. */
  fulfill: FulfillAction | null;
  refund: boolean;
  void: boolean;
  revoke: boolean;
}

/**
 * Which actions this staff member can start on this sale now. Rails checks
 * each request again; this only hides actions that cannot work.
 */
export function saleActions(sale: Schemas["Sale"], can: (permission: Permission) => boolean): SaleActions {
  const open = !sale.voided_at;
  const kept = sale.paid_minor - sale.refunded_minor;
  let fulfill: FulfillAction | null = null;
  if (open && !sale.fulfillment && !sale.fulfilled && can("purchases:fulfill")) {
    fulfill = sale.balance_minor === 0 ? "ready" : can("purchases:fulfill_unpaid") ? "early" : "blocked";
  }
  return {
    pay: open && sale.balance_minor > 0 && can("payments:create"),
    fulfill,
    refund: can("purchases:refund") && refundablePayments(sale).length > 0,
    void: open && !sale.fulfilled && kept === 0 && can("purchases:void"),
    revoke: sale.fulfillment !== null && !sale.fulfillment.revoked_at && can("memberships:revoke"),
  };
}

/* ---------- Activity ---------- */

export type SaleEventTone = "good" | "critical" | "neutral";

export interface SaleEvent {
  id: string;
  at: string;
  tone: SaleEventTone;
  text: string;
}

/** What happened to this sale, newest first. Every line comes from a timestamp Rails returned. */
export function saleActivity(sale: Schemas["Sale"]): SaleEvent[] {
  const money = (minor: number) => formatMoney(minor, sale.currency);
  const events: SaleEvent[] = [
    {
      id: `sale-${sale.id}`,
      at: sale.purchased_at,
      tone: "neutral",
      text: `${sale.channel === "online" ? "Bought online" : "Sold"} · ${money(sale.total_minor)}`,
    },
  ];
  for (const payment of sale.payments) {
    const how = payment.method === "online" ? "online" : `by ${PAYMENT_METHOD_LABEL[payment.method].toLowerCase()}`;
    events.push({ id: `payment-${payment.id}`, at: payment.received_at, tone: "neutral", text: `Paid ${money(payment.amount_minor)} ${how}` });
  }
  for (const refund of sale.refunds) {
    events.push({ id: `refund-${refund.id}`, at: refund.refunded_at, tone: "critical", text: `Refunded ${money(refund.amount_minor)} · ${refund.reason}` });
  }
  if (sale.fulfillment) {
    const { fulfillment } = sale;
    events.push({
      id: `fulfillment-${fulfillment.id}`,
      at: fulfillment.fulfilled_at,
      tone: "good",
      text: fulfillment.early
        ? `Fulfilled before full payment · ${money(fulfillment.unpaid_minor)} was due · ${fulfillment.early_reason ?? ""}`.replace(/ · $/, "")
        : "Fulfilled",
    });
    if (fulfillment.revoked_at) {
      events.push({
        id: `revoke-${fulfillment.id}`,
        at: fulfillment.revoked_at,
        tone: "critical",
        text: `Access revoked${fulfillment.revoke_reason ? ` · ${fulfillment.revoke_reason}` : ""}`,
      });
    }
  }
  if (sale.voided_at) {
    events.push({ id: `void-${sale.id}`, at: sale.voided_at, tone: "critical", text: `Voided${sale.void_reason ? ` · ${sale.void_reason}` : ""}` });
  }
  // Same instant: keep the order above (sale, money, fulfillment, corrections), newest group first.
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(b.event.at) - Date.parse(a.event.at) || b.index - a.index)
    .map(({ event }) => event);
}
