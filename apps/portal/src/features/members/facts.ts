import type { Schemas } from "@flowfokus/api";
import { BOOKING_STATUS_LABEL, DENIAL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, formatMoney } from "../../lib/format";

/*
 * Facts for the member details page, read from Rails responses only. Each
 * function states one fact: payment, delivery, and access stay separate.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A short length of time, such as "29d 16h", "5h 12m", or "8m". */
export function formatSpan(ms: number): string {
  const span = Math.max(0, ms);
  if (span >= DAY) {
    const days = Math.floor(span / DAY);
    const hours = Math.floor((span % DAY) / HOUR);
    return hours ? `${days}d ${hours}h` : `${days}d`;
  }
  if (span >= HOUR) {
    const hours = Math.floor(span / HOUR);
    const minutes = Math.floor((span % HOUR) / MINUTE);
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return span >= MINUTE ? `${Math.floor(span / MINUTE)}m` : "under 1m";
}

export type PeriodState = "current" | "upcoming" | "ended" | "revoked";

/** Where a membership period stands now, and how much of it is left (0 to 1). */
export function periodState(period: Schemas["MembershipPeriod"], now: number): { state: PeriodState; left: number } {
  const starts = Date.parse(period.starts_at);
  const ends = Date.parse(period.ends_at);
  if (period.revoked_at) return { state: "revoked", left: 0 };
  if (now >= ends) return { state: "ended", left: 0 };
  if (now < starts) return { state: "upcoming", left: 1 };
  return { state: "current", left: (ends - now) / (ends - starts) };
}

/** The status text beside a period, for example "Ends in 29d 16h". */
export function periodText(period: Schemas["MembershipPeriod"], now: number, formatDate: (iso: string) => string): string {
  const { state } = periodState(period, now);
  switch (state) {
    case "revoked":
      return "Revoked";
    case "ended":
      return `Ended ${formatDate(period.ends_at)}`;
    case "upcoming":
      return `Starts in ${formatSpan(Date.parse(period.starts_at) - now)}`;
    case "current":
      return `Ends in ${formatSpan(Date.parse(period.ends_at) - now)}`;
  }
}

/** Periods that cover now or start later, newest first, then the rest. */
export function orderPeriods(periods: Schemas["MembershipPeriod"][], now: number) {
  const live = (period: Schemas["MembershipPeriod"]) => {
    const { state } = periodState(period, now);
    return state === "current" || state === "upcoming";
  };
  const newestFirst = [...periods].reverse();
  return { active: newestFirst.filter(live), rest: newestFirst.filter((period) => !live(period)) };
}

export type PaymentFact = { state: "paid" | "partial" | "unpaid" | "void"; label: string };

/** The payment state of a sale, from `payment_status` and `voided_at`. */
export function paymentFact(sale: Schemas["Sale"]): PaymentFact {
  if (sale.voided_at || sale.payment_status === "void") return { state: "void", label: PAYMENT_STATUS_LABEL.void };
  if (sale.payment_status === "paid") return { state: "paid", label: PAYMENT_STATUS_LABEL.paid };
  if (sale.payment_status === "partially_paid") return { state: "partial", label: PAYMENT_STATUS_LABEL.partially_paid };
  return { state: "unpaid", label: PAYMENT_STATUS_LABEL.unpaid };
}

export type DeliveryFact = { state: "delivered" | "revoked" | "waiting" | "none"; label: string };

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

/** Sums by currency, as display strings, for example "RM 450.00". */
function sumByCurrency(items: { minor: number; currency: string }[]): string[] {
  const totals = new Map<string, number>();
  for (const { minor, currency } of items) totals.set(currency, (totals.get(currency) ?? 0) + minor);
  return [...totals].filter(([, minor]) => minor !== 0).map(([currency, minor]) => formatMoney(minor, currency));
}

/** Money received less refunds, over every sale. Empty when nothing was kept. */
export function totalPaid(sales: Schemas["Sale"][]): string[] {
  return sumByCurrency(sales.map((sale) => ({ minor: sale.paid_minor - sale.refunded_minor, currency: sale.currency })));
}

/** The balance still due on sales that are not void. Empty when nothing is due. */
export function balanceDue(sales: Schemas["Sale"][]): string[] {
  return sumByCurrency(
    sales.filter((sale) => !sale.voided_at).map((sale) => ({ minor: sale.balance_minor, currency: sale.currency })),
  );
}

/** Bookings that still hold a spot and start later. */
export function isUpcoming(booking: Schemas["Booking"], now: number): boolean {
  return (booking.status === "confirmed" || booking.status === "held") && Date.parse(booking.starts_at) > now;
}

export type ActivityTone = "good" | "critical" | "neutral";

export interface ActivityEvent {
  id: string;
  at: string;
  tone: ActivityTone;
  text: string;
}

/**
 * One feed of what happened to this member, newest first: check-ins, sales,
 * payments, deliveries, refunds, voids, bookings, and the day they were added.
 * Every line comes from a timestamp Rails returned.
 */
export function memberActivity(
  { member, sales, checkIns }: { member: Schemas["MemberDetail"]; sales: Schemas["Sale"][]; checkIns: Schemas["CheckIn"][] },
  locationName: (id: string | null) => string,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const rightName = (id: string | null) => member.entitlements.find((right) => right.id === id)?.name;

  for (const checkIn of checkIns) {
    const where = locationName(checkIn.location_id);
    const right = rightName(checkIn.entitlement_id);
    if (checkIn.override_reason) {
      events.push({ id: `check-in-${checkIn.id}`, at: checkIn.checked_in_at, tone: "good", text: `Let in by staff at ${where} · ${checkIn.override_reason}` });
    } else if (checkIn.result === "granted") {
      events.push({ id: `check-in-${checkIn.id}`, at: checkIn.checked_in_at, tone: "good", text: `Checked in at ${where}${right ? ` · ${right}` : ""}` });
    } else {
      const reason = checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "No reason recorded";
      events.push({ id: `check-in-${checkIn.id}`, at: checkIn.checked_in_at, tone: "critical", text: `Check-in denied at ${where} · ${reason}` });
    }
  }

  for (const sale of sales) {
    const product = sale.line_item.product_name;
    events.push({ id: `sale-${sale.id}`, at: sale.purchased_at, tone: "neutral", text: `Sold ${product} · ${formatMoney(sale.total_minor, sale.currency)}` });
    for (const payment of sale.payments) {
      events.push({
        id: `payment-${payment.id}`,
        at: payment.received_at,
        tone: "neutral",
        text: `Paid ${formatMoney(payment.amount_minor, payment.currency)} ${payment.method === "online" ? "online" : `by ${PAYMENT_METHOD_LABEL[payment.method].toLowerCase()}`} · ${product}`,
      });
    }
    if (sale.fulfillment) {
      events.push({
        id: `delivery-${sale.fulfillment.id}`,
        at: sale.fulfillment.fulfilled_at,
        tone: "neutral",
        text: `${product} delivered${sale.fulfillment.early ? " before full payment" : ""}`,
      });
      if (sale.fulfillment.revoked_at) {
        events.push({ id: `revoke-${sale.fulfillment.id}`, at: sale.fulfillment.revoked_at, tone: "critical", text: `${product} access revoked` });
      }
    }
    for (const refund of sale.refunds) {
      events.push({ id: `refund-${refund.id}`, at: refund.refunded_at, tone: "neutral", text: `Refunded ${formatMoney(refund.amount_minor, refund.currency)} · ${product}` });
    }
    if (sale.voided_at) {
      events.push({ id: `void-${sale.id}`, at: sale.voided_at, tone: "critical", text: `Sale of ${product} voided` });
    }
  }

  for (const booking of member.bookings) {
    const program = booking.program.name;
    if (booking.confirmed_at) {
      events.push({ id: `booking-${booking.id}`, at: booking.confirmed_at, tone: "neutral", text: `Booked ${program}` });
    }
    if (booking.attended_at) {
      events.push({ id: `attended-${booking.id}`, at: booking.attended_at, tone: "good", text: `${BOOKING_STATUS_LABEL.attended} ${program}` });
    }
    if (booking.cancelled_at) {
      events.push({ id: `cancelled-${booking.id}`, at: booking.cancelled_at, tone: "neutral", text: `Booking for ${program} cancelled` });
    }
  }

  events.push({ id: `joined-${member.id}`, at: member.created_at, tone: "neutral", text: "Added as a member" });
  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
