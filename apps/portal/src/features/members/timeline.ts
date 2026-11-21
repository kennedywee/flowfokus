import type { Schemas } from "@flowfokus/api";

/*
 * The Horizon: a timeline of the last week and the next 30 days. It marks
 * today, the member's bookings, and when a membership period or pass ends.
 * Every mark comes from a record Rails returned. Rails has no "renews" state,
 * so a period that is followed by another one shows no end mark.
 */

const MINUTE = 60_000;
export const PAST_DAYS = 7;
export const AHEAD_DAYS = 30;

const wallClock = (at: number, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
};

/**
 * The same wall-clock time, `days` calendar days away, in the organization's
 * time zone. A day is not always 24 hours there: clocks change.
 */
export function shiftDays(at: number, days: number, timeZone: string): number {
  const ms = ((at % 1000) + 1000) % 1000;
  const second = at - ms;
  const wall = wallClock(second, timeZone) + days * 24 * 3_600_000;
  // The offset at the wanted time, found from a first guess, then checked once.
  const offsetAt = (instant: number) => wallClock(instant, timeZone) - instant;
  const guess = wall - offsetAt(wall);
  return wall - offsetAt(guess) + ms;
}

export type HorizonTone = "neutral" | "warning" | "critical";

export interface HorizonEvent {
  id: string;
  kind: "today" | "booking" | "end";
  at: number;
  /** Before now. */
  past: boolean;
  tone: HorizonTone;
  title: string;
}

export interface Horizon {
  start: number;
  end: number;
  /** One per calendar day, from `start` to `end`. */
  ticks: number[];
  events: HorizonEvent[];
}

/** Marks for the window, oldest first. `today` is always one of them; callers show the Horizon only when another mark exists. */
export function horizonFor(
  member: Schemas["MemberDetail"],
  productName: (saleId: string) => string,
  now: number,
  timeZone: string,
): Horizon {
  const ticks = Array.from({ length: PAST_DAYS + AHEAD_DAYS + 1 }, (_, index) => shiftDays(now, index - PAST_DAYS, timeZone));
  const start = shiftDays(now, -PAST_DAYS, timeZone);
  const end = shiftDays(now, AHEAD_DAYS, timeZone);
  const inside = (at: number) => at >= start && at <= end;
  const events: HorizonEvent[] = [{ id: "today", kind: "today", at: now, past: false, tone: "neutral", title: "Today" }];

  for (const booking of member.bookings) {
    if (booking.status === "cancelled" || booking.status === "expired") continue;
    const at = Date.parse(booking.starts_at);
    if (inside(at)) events.push({ id: `booking-${booking.id}`, kind: "booking", at, past: at <= now, tone: "neutral", title: booking.program.name });
  }

  const periods = member.membership?.periods ?? [];
  for (const period of periods) {
    const ends = Date.parse(period.ends_at);
    if (period.revoked_at) {
      const at = Date.parse(period.revoked_at);
      if (inside(at)) events.push({ id: `revoked-${period.id}`, kind: "end", at, past: at <= now, tone: "critical", title: `${productName(period.sale_id)} revoked` });
      continue;
    }
    // Another period that starts as this one ends keeps the access going: nothing ends.
    const followed = periods.some(
      (other) => other.id !== period.id && !other.revoked_at && Math.abs(Date.parse(other.starts_at) - ends) <= MINUTE,
    );
    if (followed) continue;
    if (inside(ends)) events.push({ id: `end-${period.id}`, kind: "end", at: ends, past: ends <= now, tone: ends <= now ? "neutral" : "warning", title: `${productName(period.sale_id)} ends` });
  }

  for (const right of member.entitlements) {
    if (right.occurrence_id !== null) continue;
    const ends = Date.parse(right.ends_at);
    // Rails does not say which period gave a right, so a right's end stays even when a period ends then.
    if (!inside(ends)) continue;
    events.push({ id: `right-${right.id}`, kind: "end", at: ends, past: ends <= now, tone: ends <= now ? "neutral" : "warning", title: `${right.name} ends` });
  }

  events.sort((a, b) => a.at - b.at);
  return { start, end, ticks, events };
}

/** Where a time sits on the track, 0 to 1. */
export function position(at: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (at - start) / (end - start)));
}

export interface LabelBox {
  id: string;
  /** The mark's x on the track, in pixels. */
  x: number;
  /** The label's width, in pixels. */
  width: number;
}

export type LabelPlace = { lane: "above" | "below"; align: "start" | "end" };

const GAP = 10;
/** The label starts this far left of its mark (or ends this far right of it). */
const BLEED = 5;

/**
 * Puts each label above or below the line without overlapping another label.
 * Marks are placed in time order, each in the lane with more room. A label that reaches the right edge ends at
 * its mark instead of starting there. A label that fits nowhere is left out:
 * its mark stays on the line. `first` (today) is placed before the rest.
 */
export function placeLabels(boxes: readonly LabelBox[], track: number, first?: string): Map<string, LabelPlace | null> {
  const placed = new Map<string, LabelPlace | null>();
  const order = [...boxes].sort((a, b) => (a.id === first ? -1 : b.id === first ? 1 : a.x - b.x));
  const lanes: Record<"above" | "below", { left: number; right: number }[]> = { above: [], below: [] };
  const fits = (lane: "above" | "below", left: number, right: number) =>
    lanes[lane].every((box) => right + GAP <= box.left || left >= box.right + GAP);
  const reach = (lane: "above" | "below") => Math.max(-Infinity, ...lanes[lane].map((box) => box.right));
  for (const box of order) {
    const align: "start" | "end" = box.x - BLEED + box.width > track ? "end" : "start";
    const left = align === "start" ? Math.max(0, box.x - BLEED) : Math.max(0, box.x + BLEED - box.width);
    const right = left + box.width;
    // Alternate: try the lane with more room first.
    const candidates = (["above", "below"] as const).slice().sort((a, b) => reach(a) - reach(b));
    const lane = candidates.find((candidate) => fits(candidate, left, right)) ?? null;
    if (lane) lanes[lane].push({ left, right });
    placed.set(box.id, lane ? { lane, align } : null);
  }
  return placed;
}
