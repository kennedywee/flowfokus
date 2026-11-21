import type { Schemas } from "@flowfokus/api";
import { BOOKING_STATUS_LABEL, DENIAL, PAYMENT_METHOD_LABEL, formatBenefitUsage, formatMoney } from "../../lib/format";
import { fulfillmentFact, paymentFact, type FulfillmentState, type PaymentState } from "../sales/facts";

/*
 * Facts for the member details page, read from Rails responses only. Each
 * function states one fact: payment, fulfillment, and access stay separate.
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
 * payments, fulfillments, refunds, voids, bookings, and the day they were added.
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
        id: `fulfillment-${sale.fulfillment.id}`,
        at: sale.fulfillment.fulfilled_at,
        tone: "neutral",
        text: `${product} fulfilled${sale.fulfillment.early ? " before full payment" : ""}`,
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

/* ---------- Holds ---------- */

export type HoldTone = "good" | "warning" | "critical" | "neutral";

/** What the right side of a hold row shows. The words come from Rails dates and counts. */
export type HoldStatus =
  | { kind: "time"; tone: HoldTone; fraction: number; text: string }
  | { kind: "credit"; left: number; total: number }
  | { kind: "text"; text: string };

export interface HoldRow {
  id: string;
  title: string;
  /** "Membership, 3 Nov – 2 Dec" or "Access, 14 Oct – 14 Jan · Bangsar". */
  sub: string;
  /** The sale that gave the period. Rights carry no sale yet (issue #17). */
  saleId: string | null;
  status: HoldStatus;
  /** Covers now or starts later. A row that is not live shows only under "View all". */
  live: boolean;
}

/**
 * One row per membership period and one per access right. Live periods come
 * first, newest first, then rights, then periods that are over. A period reads
 * "Ends in 29d 16h": Rails has no renews state yet. A right with a limit
 * shows what is left; an unlimited one says so.
 */
export function holdRows(
  member: Schemas["MemberDetail"],
  sales: Schemas["Sale"][],
  now: number,
  shortDate: (iso: string) => string,
  locationName: (id: string | null) => string,
): HoldRow[] {
  const productName = (saleId: string) => sales.find((sale) => sale.id === saleId)?.line_item.product_name ?? "Membership period";
  const { active, rest } = orderPeriods(member.membership?.periods ?? [], now);
  const period = (item: Schemas["MembershipPeriod"], live: boolean): HoldRow => {
    const { state, left } = periodState(item, now);
    const tone: HoldTone = state === "current" ? "good" : state === "revoked" ? "critical" : "neutral";
    return {
      id: `period-${item.id}`,
      title: productName(item.sale_id),
      sub: `Membership, ${shortDate(item.starts_at)} – ${shortDate(item.ends_at)}`,
      saleId: item.sale_id,
      // A period that has not started shows an empty ring; the pie fills with the time left once it runs.
      status: { kind: "time", tone, fraction: state === "upcoming" ? 0 : left, text: periodText(item, now, shortDate) },
      live,
    };
  };
  const rights: HoldRow[] = member.entitlements
    .filter((right) => right.occurrence_id === null)
    .map((right) => {
      const status: HoldStatus = !right.active
        ? { kind: "time", tone: "neutral", fraction: 0, text: `Starts ${shortDate(right.starts_at)}` }
        : right.usage_limit !== null && right.remaining !== null
          ? { kind: "credit", left: right.remaining, total: right.usage_limit }
          : { kind: "text", text: formatBenefitUsage(right) };
      return {
        id: `right-${right.id}`,
        title: right.name,
        sub: `Access, ${shortDate(right.starts_at)} – ${shortDate(right.ends_at)} · ${locationName(right.location_id)}`,
        saleId: null,
        status,
        live: true,
      };
    });
  return [...active.map((item) => period(item, true)), ...rights, ...rest.map((item) => period(item, false))];
}

/** The rows a hold list shows before "View all": the live ones, or the latest period when none is live. */
export function visibleHolds(rows: HoldRow[]): HoldRow[] {
  const live = rows.filter((row) => row.live);
  return live.length ? live : rows.slice(0, 1);
}

/* ---------- Sale marks ---------- */

export interface SaleMark {
  kind: "paid" | "partlyPaid" | "unpaid" | "fulfilled" | "unfulfilled";
  tone: "good" | "warning" | "critical" | "neutral";
  label: string;
}

const PAYMENT_MARK: Record<PaymentState, Omit<SaleMark, "label">> = {
  paid: { kind: "paid", tone: "good" },
  partial: { kind: "partlyPaid", tone: "warning" },
  unpaid: { kind: "unpaid", tone: "critical" },
  void: { kind: "unpaid", tone: "neutral" },
};

const FULFILLMENT_MARK: Record<FulfillmentState, Omit<SaleMark, "label">> = {
  fulfilled: { kind: "fulfilled", tone: "good" },
  waiting: { kind: "unfulfilled", tone: "neutral" },
  revoked: { kind: "unfulfilled", tone: "critical" },
  none: { kind: "unfulfilled", tone: "neutral" },
};

/** The sale's two facts as marks. The labels are the words Rails gives today (#14 is open). */
export function saleMarks(sale: Schemas["Sale"]): { payment: SaleMark; fulfillment: SaleMark } {
  const payment = paymentFact(sale);
  const fulfillment = fulfillmentFact(sale);
  return {
    payment: { ...PAYMENT_MARK[payment.state], label: payment.label },
    fulfillment: { ...FULFILLMENT_MARK[fulfillment.state], label: fulfillment.label },
  };
}
