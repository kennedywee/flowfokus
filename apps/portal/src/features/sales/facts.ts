import type { Permission, Schemas } from "@flowfokus/api";
import { PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatMoney, formatTime } from "../../lib/format";

/*
 * Facts about a sale, read from Rails responses only. Payment and delivery
 * are separate facts: a paid sale is not a delivered sale. The sales list,
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

export type DeliveryState = "delivered" | "revoked" | "waiting" | "none";
export type DeliveryFact = { state: DeliveryState; label: string };

/** The delivery state of a sale, from `fulfilled` and the fulfillment record. */
export function deliveryFact(sale: Schemas["Sale"]): DeliveryFact {
  if (sale.fulfillment?.revoked_at) return { state: "revoked", label: "Access revoked" };
  if (sale.fulfilled) return { state: "delivered", label: "Delivered" };
  if (sale.voided_at) return { state: "none", label: "Not delivered" };
  return { state: "waiting", label: "Not delivered" };
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

/** Void sales are never delivered, so "Not delivered" leaves them out. */
export const DELIVERY_FILTERS: { value: Exclude<DeliveryState, "none">; label: string }[] = [
  { value: "waiting", label: "Not delivered" },
  { value: "delivered", label: "Delivered" },
  { value: "revoked", label: "Access revoked" },
];

export interface SalesFilter {
  payment: PaymentState[];
  delivery: DeliveryState[];
}

/** The search params the sales list keeps in the URL. */
export interface SalesSearch {
  payment?: string;
  delivery?: string;
  q?: string;
}

function pick<T extends string>(text: unknown, allowed: readonly T[]): T[] {
  if (typeof text !== "string") return [];
  const wanted = new Set(text.split(","));
  return allowed.filter((value) => wanted.has(value));
}

/**
 * Reads the list URL. Older links use `view=due` (money still due) and
 * `view=deliver` (paid, not delivered); they become the same filters.
 */
export function readSalesSearch(search: Record<string, unknown>): SalesSearch {
  let payment = pick(search.payment, PAYMENT_FILTERS.map((item) => item.value));
  let delivery = pick(search.delivery, DELIVERY_FILTERS.map((item) => item.value));
  if (search.view === "due" && !payment.length) payment = ["unpaid", "partial"];
  if (search.view === "deliver" && !payment.length && !delivery.length) {
    payment = ["paid"];
    delivery = ["waiting"];
  }
  const q = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
  return {
    ...(payment.length ? { payment: payment.join(",") } : {}),
    ...(delivery.length ? { delivery: delivery.join(",") } : {}),
    ...(q ? { q } : {}),
  };
}

export function filterFromSearch(search: SalesSearch): SalesFilter {
  return {
    payment: pick(search.payment, PAYMENT_FILTERS.map((item) => item.value)),
    delivery: pick(search.delivery, DELIVERY_FILTERS.map((item) => item.value)),
  };
}

/** Sales that match every chosen fact. Within one fact, any chosen value matches. */
export function filterSales(sales: Schemas["Sale"][], filter: SalesFilter, q = ""): Schemas["Sale"][] {
  const needle = q.trim().toLowerCase();
  return sales.filter((sale) => {
    if (filter.payment.length && !filter.payment.includes(paymentFact(sale).state)) return false;
    if (filter.delivery.length && !filter.delivery.includes(deliveryFact(sale).state)) return false;
    if (!needle) return true;
    return [sale.member.name, sale.member.email, sale.line_item.product_name, sale.line_item.price_label].some((text) =>
      text.toLowerCase().includes(needle),
    );
  });
}

/** How many sales have each payment and delivery state. */
export function factCounts(sales: Schemas["Sale"][]): Record<PaymentState | DeliveryState, number> {
  const counts = { paid: 0, partial: 0, unpaid: 0, void: 0, delivered: 0, revoked: 0, waiting: 0, none: 0 };
  for (const sale of sales) {
    counts[paymentFact(sale).state] += 1;
    counts[deliveryFact(sale).state] += 1;
  }
  return counts;
}

/** The list footer: "16 sales", or "1–50 of 212 sales" when there are pages. */
export function salesRange(first: number, shown: number, total: number): string {
  const noun = total === 1 ? "sale" : "sales";
  if (shown >= total) return `${total} ${noun}`;
  return `${first + 1}–${first + shown} of ${total} ${noun}`;
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

export type DeliverAction = "ready" | "early" | "blocked";

export interface SaleActions {
  pay: boolean;
  /** "ready" when paid in full, "early" when staff may deliver before payment, "blocked" otherwise. Null when delivery is done or not allowed. */
  deliver: DeliverAction | null;
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
  let deliver: DeliverAction | null = null;
  if (open && !sale.fulfillment && !sale.fulfilled && can("purchases:fulfill")) {
    deliver = sale.balance_minor === 0 ? "ready" : can("purchases:fulfill_unpaid") ? "early" : "blocked";
  }
  return {
    pay: open && sale.balance_minor > 0 && can("payments:create"),
    deliver,
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
      id: `delivery-${fulfillment.id}`,
      at: fulfillment.fulfilled_at,
      tone: "good",
      text: fulfillment.early
        ? `Delivered before full payment · ${money(fulfillment.unpaid_minor)} was due · ${fulfillment.early_reason ?? ""}`.replace(/ · $/, "")
        : "Delivered",
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
  // Same instant: keep the order above (sale, money, delivery, corrections), newest group first.
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(b.event.at) - Date.parse(a.event.at) || b.index - a.index)
    .map(({ event }) => event);
}
