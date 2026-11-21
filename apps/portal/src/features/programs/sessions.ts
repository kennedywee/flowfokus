import type { Schemas } from "@flowfokus/api";
import { dayKey, shiftDay } from "../schedule/facts";

/*
 * Pure rules for the program page: the sessions it lists, the chart of the
 * last week and the next 30 days, the fill rate, and the ways to book. Every
 * fact comes from the Rails program and the Rails schedule. Nothing is invented.
 */

type Occurrence = Schemas["Occurrence"];
type Entry = Schemas["ScheduleEntry"];

export const CHART_PAST_DAYS = 7;
export const CHART_AHEAD_DAYS = 30;
/** The fill rate covers the last four weeks. */
export const FILL_DAYS = 28;
/** The earlier sessions come from the schedule: this many days back, which is the most one request holds. */
export const HISTORY_DAYS = 62;
/** Sessions shown before "Show all sessions". */
export const SESSION_PREVIEW = 4;

/* ---------- The sessions ---------- */

/**
 * The program's sessions in time order. Rails sends the program's own times
 * from the start of today; the schedule adds the earlier ones. A session in
 * both lists counts once, and the program's own copy wins. `history` is null
 * when the schedule did not load.
 */
export function programSessions(own: readonly Occurrence[], history: readonly Entry[] | null, programId: string): Occurrence[] {
  const byId = new Map<string, Occurrence>();
  for (const entry of history ?? []) {
    if (entry.program.id !== programId) continue;
    const { program: _program, ...occurrence } = entry;
    byId.set(occurrence.id, occurrence);
  }
  for (const occurrence of own) byId.set(occurrence.id, occurrence);
  return [...byId.values()].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
}

export function isOver(occurrence: Pick<Occurrence, "ends_at">, now: number): boolean {
  return Date.parse(occurrence.ends_at) <= now;
}

/** Sessions that have not ended, soonest first, and sessions that have, latest first. */
export function splitSessions(sessions: readonly Occurrence[], now: number): { upcoming: Occurrence[]; past: Occurrence[] } {
  const upcoming = sessions.filter((session) => !isOver(session, now));
  const past = sessions.filter((session) => isOver(session, now)).reverse();
  return { upcoming, past };
}

/** The Monday of the week that holds `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return shiftDay(day, -((weekday + 6) % 7));
}

export interface SessionWeek {
  /** The Monday, YYYY-MM-DD. */
  week: string;
  sessions: Occurrence[];
}

/** Sessions grouped by week in the order given. A week starts on Monday. */
export function groupByWeek(sessions: readonly Occurrence[], timeZone: string): SessionWeek[] {
  const weeks: SessionWeek[] = [];
  for (const session of sessions) {
    const week = weekStart(dayKey(session.starts_at, timeZone));
    const last = weeks[weeks.length - 1];
    if (last?.week === week) last.sessions.push(session);
    else weeks.push({ week, sessions: [session] });
  }
  return weeks;
}

/** "Week of 23 Nov". */
export function weekLabel(week: string): string {
  const text = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${week}T00:00:00Z`));
  return `Week of ${text}`;
}

/** The text beside a row's spot stack: "11 of 12", "Full", or "Cancelled". The reason is its own text. */
export function spotsText(occurrence: Pick<Occurrence, "spots_taken" | "capacity" | "cancelled_at">): string {
  if (occurrence.cancelled_at) return "Cancelled";
  if (occurrence.capacity > 0 && occurrence.spots_taken >= occurrence.capacity) return "Full";
  return `${occurrence.spots_taken} of ${occurrence.capacity}`;
}

/* ---------- The fill rate ---------- */

export interface FillRate {
  percent: number;
  /** How many sessions the rate covers. */
  sessions: number;
}

/**
 * Spots taken over spots offered, for the sessions that ended in the last
 * four weeks and were not cancelled. Rails counts a spot as taken while its
 * booking is confirmed, attended, or held, so this is exact for the sessions
 * Rails returned. It is null when the schedule did not load (`complete` is
 * false) or no session qualifies.
 */
export function fillRate(sessions: readonly Occurrence[], now: number, timeZone: string, complete: boolean): FillRate | null {
  if (!complete) return null;
  const since = shiftDay(dayKey(new Date(now).toISOString(), timeZone), -FILL_DAYS);
  const counted = sessions.filter(
    (session) => !session.cancelled_at && isOver(session, now) && dayKey(session.ends_at, timeZone) > since && session.capacity > 0,
  );
  if (!counted.length) return null;
  const offered = counted.reduce((sum, session) => sum + session.capacity, 0);
  const taken = counted.reduce((sum, session) => sum + Math.min(session.spots_taken, session.capacity), 0);
  return { percent: Math.round((taken / offered) * 100), sessions: counted.length };
}

/* ---------- The chart ---------- */

export interface ChartDay {
  day: string;
  sessions: Occurrence[];
}

export interface ChartTick {
  /** Index into `days`. */
  index: number;
  label: string;
}

export interface Chart {
  days: ChartDay[];
  todayIndex: number;
  /** A tick label on each Monday. */
  ticks: ChartTick[];
  /** The last session that is not cancelled, even after the window. */
  last: Occurrence | null;
  /** The first cancelled session in the window, for its label. */
  firstCancelled: string | null;
}

/**
 * One column per session over the last 7 and the next 30 calendar days in the
 * organization's time zone. A day is one slot; a day with two sessions holds two
 * columns. It is null when no session falls in the window.
 */
export function chartFor(sessions: readonly Occurrence[], now: number, timeZone: string): Chart | null {
  const today = dayKey(new Date(now).toISOString(), timeZone);
  const first = shiftDay(today, -CHART_PAST_DAYS);
  const days: ChartDay[] = Array.from({ length: CHART_PAST_DAYS + CHART_AHEAD_DAYS + 1 }, (_, index) => ({ day: shiftDay(first, index), sessions: [] }));
  const slot = new Map(days.map((day, index) => [day.day, index]));
  for (const session of sessions) {
    const index = slot.get(dayKey(session.starts_at, timeZone));
    if (index !== undefined) days[index]?.sessions.push(session);
  }
  if (!days.some((day) => day.sessions.length)) return null;
  const monday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
  const ticks = days.flatMap((day, index) =>
    new Date(`${day.day}T00:00:00Z`).getUTCDay() === 1 ? [{ index, label: monday.format(new Date(`${day.day}T00:00:00Z`)) }] : [],
  );
  const live = sessions.filter((session) => !session.cancelled_at);
  const cancelled = days.flatMap((day) => day.sessions).find((session) => session.cancelled_at);
  return {
    days,
    todayIndex: CHART_PAST_DAYS,
    ticks,
    last: live[live.length - 1] ?? null,
    firstCancelled: cancelled?.id ?? null,
  };
}

/* ---------- Ways to book ---------- */

export type WayType = "Membership" | "Pass" | "Ticket";

export interface Way {
  id: string;
  name: string;
  type: WayType;
  /** "Included", "1 credit", or the ticket price. */
  price: string;
  /** Set for a ticket, which staff manage. */
  ticket?: Schemas["Price"];
}

/**
 * What can book this program, in Paper's order: memberships, passes, then
 * tickets. Rails sends the passes and memberships that cover the program
 * (`accepted_by`) and the ticket prices. A booking with a pass or membership
 * uses one credit, so a pass reads "1 credit" and a membership "Included", as
 * in Paper; Rails does not send the credits per program (issue #20).
 */
export function waysToBook(program: Pick<Schemas["ProgramDetail"], "accepted_by" | "ticket">, format: (price: Schemas["Price"]) => string): Way[] {
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  const offers = [...program.accepted_by].sort(byName).map(
    (offer): Way => ({ id: offer.id, name: offer.name, type: offer.kind === "pass" ? "Pass" : "Membership", price: offer.kind === "pass" ? "1 credit" : "Included" }),
  );
  const rank = (way: Way) => (way.type === "Membership" ? 0 : 1);
  offers.sort((a, b) => rank(a) - rank(b));
  const tickets = [...(program.ticket?.prices ?? [])]
    .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }))
    .map((price): Way => ({ id: price.id, name: price.label, type: "Ticket", price: format(price), ticket: price }));
  return [...offers, ...tickets];
}
