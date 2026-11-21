import type { Schemas } from "@flowfokus/api";
import { formatMoney } from "../../lib/format";
import { createIdempotencyKey } from "../../lib/idempotency";

/** "07:42": a 24-hour clock time in the organization's time zone, as in Paper. */
export function clockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

type Occurrence = Schemas["Occurrence"];
type Entry = Schemas["ScheduleEntry"];
type Booking = Schemas["Booking"];

/** The schedule shows two weeks at a time. */
export const DAYS = 14;
/** A ticket sale buys at most this many spots. Rails has the same limit. */
export const MAX_SPOTS = 10;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ---------- The schedule URL ---------- */

/** `from` is the first day; `program` is a comma list of program IDs. */
export interface ScheduleSearch {
  from?: string;
  program?: string;
}

export function readScheduleSearch(search: Record<string, unknown>): ScheduleSearch {
  const clean: ScheduleSearch = {};
  if (typeof search.from === "string" && DATE.test(search.from)) clean.from = search.from;
  const programs = readPrograms(typeof search.program === "string" ? search.program : undefined);
  if (programs.length) clean.program = programs.join(",");
  return clean;
}

export function readPrograms(value: string | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").filter((id) => UUID.test(id)))];
}

/* ---------- Days and times ---------- */

/** A calendar day as YYYY-MM-DD in the gym's time zone. */
export function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(new Date(iso));
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayParts(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(new Date(`${day}T00:00:00Z`));
}

/** "Thu 5 Nov – Wed 18 Nov": the range Earlier and Later move through. */
export function rangeLabel(from: string, days: number = DAYS): string {
  const short = (day: string) => dayParts(day, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
  return `${short(from)} – ${short(shiftDay(from, days - 1))}`;
}

/** "Today, Thursday 5 November" or "Friday 6 November": a day band. */
export function dayTitle(day: string, today: string): string {
  const title = dayParts(day, { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
  return day === today ? `Today, ${title}` : title;
}

export function sessionCount(count: number): string {
  return count === 1 ? "1 session" : `${count} sessions`;
}

/** "07:00 – 08:00" on a 24-hour clock, as in Paper. */
export function clockRange(startsAt: string, endsAt: string, timeZone: string): string {
  return `${clockTime(startsAt, timeZone)} – ${clockTime(endsAt, timeZone)}`;
}

/** "30 min", "1 h", or "1 h 30 min". */
export function lengthLabel(startsAt: string, endsAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "Thu 5 Nov, 07:00": the session's name in the breadcrumb and dialogs. */
export function sessionName(startsAt: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" })
    .format(new Date(startsAt))
    .replace(",", "");
  return `${day}, ${clockTime(startsAt, timeZone)}`;
}

/** "Thu 5 Nov, 07:00 – 08:00": the session page title. */
export function sessionTitle(startsAt: string, endsAt: string, timeZone: string): string {
  return `${sessionName(startsAt, timeZone)} – ${clockTime(endsAt, timeZone)}`;
}

/** "Today", "Yesterday", or "29 Oct" in the gym's time zone. */
export function shortDay(iso: string, timeZone: string, now: Date = new Date()): string {
  const day = dayKey(iso, timeZone);
  const today = dayKey(now.toISOString(), timeZone);
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  return dayParts(day, { day: "numeric", month: "short" });
}

/* ---------- A session's state ---------- */

export type SessionState = "cancelled" | "ended" | "full" | "open";

/** Cancelled first, then ended, then full. The facts come from Rails. */
export function sessionState(occurrence: Occurrence, now: Date = new Date()): SessionState {
  if (occurrence.cancelled_at) return "cancelled";
  if (new Date(occurrence.ends_at) <= now) return "ended";
  if (occurrence.spots_left === 0) return "full";
  return "open";
}

export function bookedText(occurrence: Pick<Occurrence, "spots_taken" | "capacity">): string {
  return `${occurrence.spots_taken} of ${occurrence.capacity} booked`;
}

/** The status on a schedule row: "Ended · 11 of 12 booked", "Cancelled · Coach unwell", "Full", "9 of 14 booked". */
export function rowStatusText(occurrence: Occurrence, now: Date = new Date()): string {
  switch (sessionState(occurrence, now)) {
    case "cancelled":
      return occurrence.cancel_reason ? `Cancelled · ${occurrence.cancel_reason}` : "Cancelled";
    case "ended":
      return `Ended · ${bookedText(occurrence)}`;
    case "full":
      return "Full";
    case "open":
      return bookedText(occurrence);
  }
}

/** The Status property on the session page. The reason is its own property. */
export function sessionStatusText(occurrence: Occurrence, now: Date = new Date()): string {
  switch (sessionState(occurrence, now)) {
    case "cancelled":
      return "Cancelled";
    case "ended":
      return "Ended";
    case "full":
      return "Full";
    case "open":
      return bookedText(occurrence);
  }
}

/** The Capacity property: "12 spots", with the count when Status does not say it. */
export function capacityText(occurrence: Occurrence, now: Date = new Date()): string {
  const spots = occurrence.capacity === 1 ? "1 spot" : `${occurrence.capacity} spots`;
  const state = sessionState(occurrence, now);
  return state === "full" || state === "ended" ? `${spots} · ${occurrence.spots_taken} booked` : spots;
}

/** "Group class · Daniel Wong", or the length when nobody hosts it. */
export function programLine(entry: Entry, kindLabel: string): string {
  return `${kindLabel} · ${entry.program.host_name ?? lengthLabel(entry.starts_at, entry.ends_at)}`;
}

/* ---------- The schedule list ---------- */

/** Sessions at the top bar location. With no location, every session. */
export function atLocation(entries: Entry[], locationId: string | null): Entry[] {
  return locationId ? entries.filter((entry) => entry.program.location_id === locationId) : entries;
}

export interface ProgramCount {
  id: string;
  name: string;
  count: number;
}

/** Each program on the loaded schedule, with its session count, by name. */
export function programCounts(entries: Entry[]): ProgramCount[] {
  const counts = new Map<string, ProgramCount>();
  for (const entry of entries) {
    const found = counts.get(entry.program.id);
    if (found) found.count += 1;
    else counts.set(entry.program.id, { id: entry.program.id, name: entry.program.name, count: 1 });
  }
  return [...counts.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function filterPrograms(entries: Entry[], programIds: string[]): Entry[] {
  if (!programIds.length) return entries;
  const chosen = new Set(programIds);
  return entries.filter((entry) => chosen.has(entry.program.id));
}

/** Sessions by day, in order. Rails sends them in start order. */
export function groupByDay(entries: Entry[], timeZone: string): [string, Entry[]][] {
  const days = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = dayKey(entry.starts_at, timeZone);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }
  return [...days.entries()];
}

/* ---------- Bookings on a session ---------- */

export type BookingGroup = "not_marked" | "attended" | "cancelled";

/**
 * The roster bands. Booked and held spots are not marked yet; attended spots
 * are marked present; cancelled and expired spots are free again.
 */
export function bookingGroup(status: Schemas["BookingStatus"]): BookingGroup {
  if (status === "attended") return "attended";
  if (status === "cancelled" || status === "expired") return "cancelled";
  return "not_marked";
}

export function groupBookings(bookings: Booking[]): Record<BookingGroup, Booking[]> {
  const groups: Record<BookingGroup, Booking[]> = { not_marked: [], attended: [], cancelled: [] };
  for (const booking of bookings) groups[bookingGroup(booking.status)].push(booking);
  return groups;
}

/** Who else is on the booking: "Guest of Ben Tan" or "Booked by Ben Tan". */
export function holderNote(booking: Booking): string | null {
  if (!booking.member) return `Guest of ${booking.holder.name}`;
  return booking.holder.id === booking.member.id ? null : `Booked by ${booking.holder.name}`;
}

/**
 * What happened to a cancelled spot, from the Rails booking. The reason shows
 * only when it differs from the session's own reason.
 */
export function cancelNote(booking: Booking, sessionReason: string | null): string | null {
  if (booking.status === "expired") return "Hold expired, payment not received";
  if (booking.status !== "cancelled") return null;
  const parts: string[] = [];
  if (booking.cancel_reason && booking.cancel_reason !== sessionReason) parts.push(booking.cancel_reason);
  if (booking.use_returned) parts.push("Credit returned");
  else if (booking.source === "ticket") parts.push("Refund from the sale");
  else parts.push("Booking cancelled");
  return parts.join(" · ");
}

/** The pass, membership, or ticket on the row. A held spot has no right yet. */
export function rightLabel(booking: Booking): string {
  return booking.entitlement?.name ?? (booking.source === "ticket" ? "Ticket" : "No pass");
}

/** The date on the right of a row: when the spot was booked or cancelled. */
export function bookingDay(booking: Booking): string | null {
  if (booking.status === "cancelled" || booking.status === "expired") return booking.cancelled_at ?? booking.confirmed_at;
  return booking.confirmed_at;
}

/* ---------- Book member ---------- */

/** "Unlimited · until 30 Nov" or "7 left · until 3 Jan". */
export function rightDetail(right: Pick<Schemas["Entitlement"], "remaining" | "ends_at">, timeZone: string): string {
  const until = new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short" }).format(new Date(right.ends_at));
  return `${right.remaining === null ? "Unlimited" : `${right.remaining} left`} · until ${until}`;
}

/** "RM 35.00", or "3 × RM 35.00 = RM 105.00" for several spots. */
export function ticketPriceText(price: Pick<Schemas["Price"], "amount_minor" | "currency">, count: number): string {
  const each = formatMoney(price.amount_minor, price.currency);
  return count > 1 ? `${count} × ${each} = ${formatMoney(price.amount_minor * count, price.currency)}` : each;
}

/** The footer action: "Sell Drop-in · RM 35.00" or "Sell 3 × Drop-in · RM 105.00". */
export function sellLabel(price: Pick<Schemas["Price"], "label" | "amount_minor" | "currency">, count: number): string {
  const total = formatMoney(price.amount_minor * count, price.currency);
  return count > 1 ? `Sell ${count} × ${price.label} · ${total}` : `Sell ${price.label} · ${total}`;
}

/** How many tickets staff can choose: the spots left, at most ten, at least one. */
export function spotChoices(spotsLeft: number): number {
  return Math.max(1, Math.min(MAX_SPOTS, spotsLeft));
}

/** One spot of a ticket sale: a member of this gym, or a guest by name. */
export interface Spot {
  kind: "member" | "guest";
  memberId: string;
  name: string;
  email: string;
}

/** The spots for `count` tickets. The buyer takes the first; new spots are guests. */
export function resizeSpots(spots: Spot[], count: number, buyerId: string): Spot[] {
  const base = spots.length ? spots : [{ kind: "member" as const, memberId: buyerId, name: "", email: "" }];
  return Array.from({ length: count }, (_, index) => base[index] ?? { kind: "guest" as const, memberId: "", name: "", email: "" });
}

/** The first spot without a member or a guest name, or -1. One ticket needs no names. */
export function missingSpot(spots: Spot[]): number {
  if (spots.length < 2) return -1;
  return spots.findIndex((spot) => (spot.kind === "member" ? !spot.memberId : !spot.name.trim()));
}

/** The attendees Rails needs for several spots. One ticket books the buyer. */
export function ticketAttendees(spots: Spot[]): Schemas["AttendeeInput"][] | undefined {
  if (spots.length < 2) return undefined;
  return spots.map((spot) =>
    spot.kind === "member" ? { member_id: spot.memberId } : { guest_name: spot.name.trim(), guest_email: spot.email.trim() || null },
  );
}

/* ---------- Retry-safe ticket sales ---------- */

/** A sale request and the Idempotency-Key Rails uses to record it once. */
export interface SaleAttempt {
  signature: string;
  key: string;
}

/**
 * The key for this sale request. A retry of the same request keeps the key, so
 * Rails replays the first answer instead of selling twice. A changed request
 * gets a new key, so Rails does not reject it as a reused key.
 */
export function saleAttempt(request: unknown, previous: SaleAttempt | null, newKey: () => string = createIdempotencyKey): SaleAttempt {
  const signature = JSON.stringify(request);
  return previous && previous.signature === signature ? previous : { signature, key: newKey() };
}
