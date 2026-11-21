import type { Schemas } from "@flowfokus/api";
import { clockTime } from "../check-ins/facts";

/*
 * Pure rules for the session page: the "Starts in" stat and the arrival
 * ribbon. Every fact comes from the Rails roster. Rails records when a member
 * was checked in (`attended_at`) and nothing about arrival before that, so the
 * ribbon shows the members who are here and counts the rest.
 */

type Roster = Schemas["Roster"];
type Booking = Schemas["Booking"];

const MINUTE = 60_000;

/**
 * "20 min", "2 h 5 min", "2 h", "3 d", or "3 d 4 h". Rounds up to the minute,
 * because "Starts in 0 min" would be wrong a second before the start.
 */
export function spanText(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}

/**
 * The stat at the top right: "Starts in 20 min" before the start, "Ends in 35
 * min" while it runs, and "Ended 2 h ago" after. A cancelled session has none.
 */
export function clockStat(roster: Pick<Roster, "starts_at" | "ends_at" | "cancelled_at">, now: number): { label: string; value: string } | null {
  if (roster.cancelled_at) return null;
  const starts = Date.parse(roster.starts_at);
  const ends = Date.parse(roster.ends_at);
  if (now < starts) return { label: "Starts in", value: spanText(starts - now) };
  if (now < ends) return { label: "Ends in", value: spanText(ends - now) };
  return { label: "Ended", value: `${spanText(now - ends)} ago` };
}

/* ---------- Who is here ---------- */

export interface Arrival {
  id: string;
  name: string;
  /** When Rails marked the booking attended. */
  at: number;
}

/** The members who are here, in the order they arrived. */
export function arrivals(bookings: readonly Booking[]): Arrival[] {
  return bookings
    .filter((booking) => booking.status === "attended" && booking.attended_at)
    .map((booking) => ({ id: booking.id, name: booking.attendee_name, at: Date.parse(booking.attended_at as string) }))
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

export interface ArrivalCounts {
  here: number;
  /** Booked or held, and not checked in. */
  waiting: number;
  /** Spots Rails says are open. */
  open: number;
}

export function arrivalCounts(roster: Pick<Roster, "bookings" | "spots_left">): ArrivalCounts {
  let here = 0;
  let waiting = 0;
  for (const booking of roster.bookings) {
    if (booking.status === "attended") here += 1;
    else if (booking.status === "confirmed" || booking.status === "held") waiting += 1;
  }
  return { here, waiting, open: roster.spots_left };
}

/** "9 to arrive, 1 spot open", or "2 here, 9 not checked in, 1 spot open" once the session is over. */
export function ribbonText(counts: ArrivalCounts, over: boolean): { waiting: string; rest: string } {
  const spots = `${counts.open} ${counts.open === 1 ? "spot" : "spots"} open`;
  if (over) return { waiting: String(counts.waiting), rest: ` not checked in, ${spots}` };
  return { waiting: String(counts.waiting), rest: ` to arrive, ${spots}` };
}

/* ---------- The time axis ---------- */

export interface Axis {
  start: number;
  end: number;
  ticks: { at: number; label: string }[];
}

/** The gym's offset from UTC at `at`, in ms. */
function offsetAt(at: number, timeZone: string): number {
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
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wall - Math.floor(at / 1000) * 1000;
}

/** A tick every 30 minutes for a short session, every hour for a longer one, every 3 hours beyond that. */
function stepFor(span: number): number {
  if (span <= 150 * MINUTE) return 30 * MINUTE;
  if (span <= 6 * 60 * MINUTE) return 60 * MINUTE;
  return 180 * MINUTE;
}

/**
 * The axis runs from 30 minutes before the start (or the first arrival, if it
 * came earlier) to the end of the session (or the last arrival, if it came
 * later). Ticks sit on the gym's clock, on the half hour or the hour.
 */
export function axisFor(roster: Pick<Roster, "starts_at" | "ends_at">, here: readonly Arrival[], timeZone: string): Axis {
  const starts = Date.parse(roster.starts_at);
  const ends = Date.parse(roster.ends_at);
  const first = here[0]?.at ?? Infinity;
  const last = here[here.length - 1]?.at ?? -Infinity;
  const start = Math.min(starts - 30 * MINUTE, first - 5 * MINUTE);
  const end = Math.max(ends, last + 5 * MINUTE);
  const step = stepFor(end - start);
  const offset = offsetAt(starts, timeZone);
  const ticks: Axis["ticks"] = [];
  for (let at = Math.ceil((start + offset) / step) * step - offset; at <= end; at += step) {
    ticks.push({ at, label: clockTime(new Date(at).toISOString(), timeZone) });
  }
  return { start, end, ticks };
}

/** Where a time sits on the axis, 0 to 1. */
export function axisPosition(at: number, axis: Pick<Axis, "start" | "end">): number {
  return Math.min(1, Math.max(0, (at - axis.start) / (axis.end - axis.start)));
}

export interface Placed {
  id: string;
  x: number;
  /** 0 is the row nearest the axis. */
  lane: number;
}

/**
 * Stacks avatars so none covers another: each goes in the lowest lane where
 * its `width` clears the last avatar there. An avatar that would need a lane
 * above `lanes` is left out; the booking list still shows that member.
 */
export function placeAvatars(items: readonly { id: string; x: number }[], width: number, lanes: number): Placed[] {
  const right: number[] = [];
  const placed: Placed[] = [];
  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    let lane = right.findIndex((edge) => item.x - width / 2 >= edge);
    if (lane === -1) lane = right.length;
    if (lane >= lanes) continue;
    right[lane] = item.x + width / 2;
    placed.push({ id: item.id, x: item.x, lane });
  }
  return placed;
}
