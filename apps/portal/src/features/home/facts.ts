import type { Schemas } from "@flowfokus/api";
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

export interface AttentionItem {
  kind: "balance_due" | "unfulfilled";
  title: string;
}

/**
 * Needs attention, from the Rails counts. A balance due is any sale with money
 * owed. Unfulfilled counts only paid sales, because that is what Rails counts.
 */
export function attentionItems(overview: Pick<Schemas["StaffOverview"], "unpaid_sale_count" | "awaiting_fulfillment_count">): AttentionItem[] {
  const items: AttentionItem[] = [];
  const due = overview.unpaid_sale_count;
  if (due > 0) items.push({ kind: "balance_due", title: `${due} ${due === 1 ? "sale" : "sales"} with a balance due` });
  const waiting = overview.awaiting_fulfillment_count;
  if (waiting > 0) {
    items.push({ kind: "unfulfilled", title: `${waiting} paid ${waiting === 1 ? "sale" : "sales"} unfulfilled` });
  }
  return items;
}
