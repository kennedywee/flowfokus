import { formatMoney, type Schemas } from "@flowfokus/api";
import { dayKey } from "../schedule/facts";

type Entry = Schemas["ScheduleEntry"];

/** Up next shows this many sessions. The rest are on the schedule. */
export const UP_NEXT = 4;

/** "Wednesday 4 Nov": today in the gym's time zone, under the title. */
export function todayLabel(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "long", day: "numeric", month: "short" })
    .format(now)
    .replace(",", "");
}

/** Today's sessions in the gym's time zone. Rails sends them in start order. */
export function todaysSessions(entries: Entry[], timeZone: string, now: Date = new Date()): Entry[] {
  const today = dayKey(now.toISOString(), timeZone);
  return entries.filter((entry) => dayKey(entry.starts_at, timeZone) === today);
}

/** Sessions that have not ended yet, cancelled ones included, so staff see the change. */
export function upNext(today: Entry[], now: Date = new Date(), limit: number = UP_NEXT): Entry[] {
  return today.filter((entry) => new Date(entry.ends_at) > now).slice(0, limit);
}

/** "4 of 9 today" in the band, or "9 today" when every session shows. */
export function upNextCount(shown: number, total: number): string {
  return shown < total ? `${shown} of ${total} today` : `${total} today`;
}

/**
 * "58 of 96 spots": booked spots in today's sessions that run. Cancelled
 * sessions free their spots, so they are left out. Null with no sessions.
 */
export function bookingsText(today: Entry[]): string | null {
  const running = today.filter((entry) => !entry.cancelled_at);
  if (!running.length) return null;
  const taken = running.reduce((sum, entry) => sum + entry.spots_taken, 0);
  const capacity = running.reduce((sum, entry) => sum + entry.capacity, 0);
  return `${taken} of ${capacity} ${capacity === 1 ? "spot" : "spots"}`;
}

/** "86 · 3 denied", or "86" when nobody was denied. Rails counts since midnight. */
export function checkInsText(counts: { granted: number; denied: number }): string {
  const total = counts.granted + counts.denied;
  return counts.denied ? `${total} · ${counts.denied} denied` : `${total}`;
}

/** "86 check-ins" for the phone title line. */
export function checkInsLine(counts: { granted: number; denied: number }): string {
  const total = counts.granted + counts.denied;
  return `${total} ${total === 1 ? "check-in" : "check-ins"}`;
}

type Overview = Schemas["StaffOverview"];
type Money = Schemas["StaffOverviewMoney"];

export interface AttentionItem {
  kind: "balance_due" | "unfulfilled" | "ending";
  title: string;
  /** The amount due, or who waits. Only for roles that see money. */
  line?: string;
}

/**
 * Needs attention, from the Rails counts. A balance due is any sale with money
 * owed. Unfulfilled counts only paid sales, because that is what Rails counts.
 * Rails sends `money` only to roles with purchases:read.
 */
export function attentionItems(
  overview: Pick<Overview, "unpaid_sale_count" | "awaiting_fulfillment_count" | "memberships_ending_count" | "currency" | "money">,
  now: Date = new Date(),
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { money, currency } = overview;
  const due = overview.unpaid_sale_count;
  if (due > 0) {
    items.push({
      kind: "balance_due",
      title: `${due} ${due === 1 ? "sale" : "sales"} with a balance due`,
      ...(money && currency ? { line: dueLine(money.due, currency, now) } : {}),
    });
  }
  const waiting = overview.awaiting_fulfillment_count;
  if (waiting > 0) {
    const names = money?.awaiting_fulfillment.map((sale) => sale.member_name) ?? [];
    items.push({
      kind: "unfulfilled",
      title: `${waiting} paid ${waiting === 1 ? "sale" : "sales"} unfulfilled`,
      ...(names.length ? { line: nameList(names, waiting) } : {}),
    });
  }
  const ending = overview.memberships_ending_count ?? 0;
  if (ending > 0) {
    items.push({ kind: "ending", title: `${ending} ${ending === 1 ? "membership ends" : "memberships end"} in the next 7 days` });
  }
  return items;
}

/** "RM 640.00 · oldest 34 days": the total due and the age of the oldest sale with a balance. */
export function dueLine(due: Money["due"], currency: string, now: Date = new Date()): string {
  const total = formatMoney(due.total_minor, currency);
  if (!due.oldest_sale) return total;
  const days = Math.floor((now.getTime() - new Date(due.oldest_sale.purchased_at).getTime()) / 86_400_000);
  return `${total} · oldest ${days < 1 ? "today" : `${days} ${days === 1 ? "day" : "days"}`}`;
}

/** "Ben, Aina, and 2 more": the names Rails sent, then how many of `total` it left out. */
export function nameList(names: string[], total: number): string {
  const rest = total - names.length;
  const parts = rest > 0 ? [...names, `${rest} more`] : names;
  if (parts.length <= 2) return parts.join(" and ");
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** "RM 200.00 · 2 sales" for Today. Void sales are not counted. */
export function salesText(sales: Money["sales_today"], currency: string): string {
  const total = formatMoney(sales.total_minor, currency);
  return sales.count ? `${total} · ${sales.count} ${sales.count === 1 ? "sale" : "sales"}` : total;
}

export interface SetupStep {
  key: keyof NonNullable<Overview["setup"]>;
  title: string;
  done: boolean;
}

const SETUP_TITLES: Record<SetupStep["key"], string> = {
  location: "Add a location",
  product: "Add a product",
  member: "Add a member",
  sale: "Record a sale",
};

/** The first-run steps, in order. Null once the organization has done them all. */
export function setupSteps(setup: Overview["setup"]): SetupStep[] | null {
  if (!setup) return null;
  const steps = (Object.keys(SETUP_TITLES) as SetupStep["key"][]).map((key) => ({ key, title: SETUP_TITLES[key], done: setup[key] }));
  return steps.every((step) => step.done) ? null : steps;
}
