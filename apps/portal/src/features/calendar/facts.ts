import type { Schemas } from "@flowfokus/api";
import { clockTime, dayKey, filterPrograms, readPrograms, sessionState, shiftDay, type SessionState } from "../schedule/facts";

/*
 * Calendar rules: what the URL holds, which days to ask Rails for, how
 * sessions group into columns and rows, where a block sits on the Day grid,
 * and how the arrow keys move between blocks. Every fact comes from the Rails
 * schedule. Nothing here is drawn from sample data.
 */

type Entry = Schemas["ScheduleEntry"];
type Kind = Schemas["ProgramKind"];

export type CalendarView = "day" | "week";
export type CalendarGroup = "none" | "program" | "host";

/** The view and grouping a link without those parameters opens. */
export const DEFAULT_VIEW: CalendarView = "day";
export const DEFAULT_GROUP: CalendarGroup = "host";

/** The three kinds of session, in the order of the kinds row. The URL slug is the second field. */
export const KINDS: readonly { kind: Kind; slug: string; label: string; icon: "groupClass" | "appointment" | "event" }[] = [
  { kind: "group_class", slug: "class", label: "Classes", icon: "groupClass" },
  { kind: "appointment", slug: "appointment", label: "Appointments", icon: "appointment" },
  { kind: "event", slug: "event", label: "Events", icon: "event" },
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- The URL ---------- */

/**
 * What the Calendar keeps in the URL. A value that equals its default is left
 * out, so a plain `/calendar` is today, by host, with every kind.
 * `date` is any day in the range; `week` shows the Monday to Sunday that holds it;
 * `hide` lists the kinds that are switched off (`class`, `appointment`, `event`).
 */
export interface CalendarSearch {
  date?: string;
  view?: "week";
  group?: "none" | "program";
  program?: string;
  hide?: string;
}

export function readCalendarSearch(search: Record<string, unknown>): CalendarSearch {
  const clean: CalendarSearch = {};
  if (typeof search.date === "string" && DATE.test(search.date) && !Number.isNaN(Date.parse(`${search.date}T00:00:00Z`))) {
    clean.date = search.date;
  }
  if (search.view === "week") clean.view = "week";
  if (search.group === "none" || search.group === "program") clean.group = search.group;
  const programs = readPrograms(typeof search.program === "string" ? search.program : undefined);
  if (programs.length) clean.program = programs.join(",");
  const hide = hiddenParam(readHidden(typeof search.hide === "string" ? search.hide : undefined));
  if (hide) clean.hide = hide;
  return clean;
}

/** The hidden kinds, as Rails kinds, in the order of the kinds row. */
export function readHidden(value: string | undefined): Kind[] {
  if (!value) return [];
  const slugs = new Set(value.split(","));
  return KINDS.filter((item) => slugs.has(item.slug)).map((item) => item.kind);
}

export function hiddenParam(hidden: readonly Kind[]): string | undefined {
  const slugs = KINDS.filter((item) => hidden.includes(item.kind)).map((item) => item.slug);
  return slugs.length ? slugs.join(",") : undefined;
}

export function viewOf(search: CalendarSearch): CalendarView {
  return search.view ?? DEFAULT_VIEW;
}

export function groupOf(search: CalendarSearch): CalendarGroup {
  return search.group ?? DEFAULT_GROUP;
}

/** The URL value of a grouping: the default is left out. */
export function groupParam(group: CalendarGroup): CalendarSearch["group"] {
  return group === DEFAULT_GROUP ? undefined : (group as "none" | "program");
}

/* ---------- Days ---------- */

/** 0 for Monday through 6 for Sunday. */
function weekdayIndex(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** The Monday of the week that holds `day`. */
export function weekStart(day: string): string {
  return shiftDay(day, -weekdayIndex(day));
}

/** The first day to ask Rails for, and how many days. Day is one day; Week is Monday to Sunday. */
export function rangeFor(view: CalendarView, date: string): { from: string; days: number } {
  return view === "week" ? { from: weekStart(date), days: 7 } : { from: date, days: 1 };
}

/** The date after one Previous or Next press: a day or a week. */
export function stepDate(view: CalendarView, date: string, direction: -1 | 1): string {
  return shiftDay(date, direction * (view === "week" ? 7 : 1));
}

function dayParts(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(new Date(`${day}T00:00:00Z`));
}

/** "Sat 21 Nov": a day on the Day toolbar and a Week column. */
export function shortDate(day: string): string {
  return dayParts(day, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
}

/** "Mon 16 – Sun 22 Nov", or "Mon 30 Nov – Sun 6 Dec" across a month. */
export function weekLabel(from: string): string {
  const last = shiftDay(from, 6);
  const sameMonth = dayParts(from, { month: "short" }) === dayParts(last, { month: "short" });
  const start = sameMonth ? dayParts(from, { weekday: "short", day: "numeric" }) : shortDate(from);
  return `${start.replace(",", "")} – ${shortDate(last)}`;
}

/** The toolbar date: one day, or the week. */
export function rangeText(view: CalendarView, date: string): string {
  return view === "week" ? weekLabel(weekStart(date)) : shortDate(date);
}

/** The year for the page's accessible title, such as "Saturday 21 November 2026". */
export function longDate(day: string): string {
  return dayParts(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", "");
}

/** Mon to Sun for the week that starts on `from`. */
export function weekDays(from: string): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDay(from, index));
}

/** "Mon" and "16", the two parts of a Week column head. */
export function dayHead(day: string): { weekday: string; date: string } {
  return { weekday: dayParts(day, { weekday: "short" }), date: dayParts(day, { day: "numeric" }) };
}

/* ---------- Counts and filters ---------- */

export function kindCounts(entries: readonly Entry[]): Record<Kind, number> {
  const counts: Record<Kind, number> = { group_class: 0, appointment: 0, event: 0 };
  for (const entry of entries) counts[entry.program.kind] += 1;
  return counts;
}

export function filterKinds(entries: readonly Entry[], hidden: readonly Kind[]): Entry[] {
  return hidden.length ? entries.filter((entry) => !hidden.includes(entry.program.kind)) : [...entries];
}

/** The program filter, then the kinds that are on. `counts` are of the sessions the program filter keeps. */
export function applyFilters(entries: readonly Entry[], programs: readonly string[], hidden: readonly Kind[]) {
  const byProgram = filterPrograms([...entries], [...programs]);
  return { counts: kindCounts(byProgram), shown: filterKinds(byProgram, hidden) };
}

/* ---------- Groups ---------- */

export interface CalendarGroupData {
  key: string;
  label: string;
  entries: Entry[];
}

export const NO_HOST = "No host";
const NO_HOST_KEY = "";

/** A host's name as the key: trimmed, and one key for "Sam" and "sam". */
function hostKey(entry: Entry): string {
  return entry.program.host_name?.trim().toLowerCase() ?? NO_HOST_KEY;
}

/**
 * Sessions into columns (Day) or rows (Week). None is one group. Program is a
 * group per program, by name. Host is a group per `host_name`, by name, and
 * "No host" last. A group exists only when it has a session.
 */
export function groupEntries(entries: readonly Entry[], group: CalendarGroup): CalendarGroupData[] {
  if (group === "none") return entries.length ? [{ key: "all", label: "All sessions", entries: [...entries] }] : [];
  const groups = new Map<string, CalendarGroupData>();
  for (const entry of entries) {
    const key = group === "program" ? entry.program.id : hostKey(entry);
    const label = group === "program" ? entry.program.name : entry.program.host_name?.trim() || NO_HOST;
    const found = groups.get(key);
    if (found) found.entries.push(entry);
    else groups.set(key, { key: group === "host" && key === NO_HOST_KEY ? "no-host" : key, label, entries: [entry] });
  }
  return [...groups.values()].sort((a, b) => {
    if (group === "host") {
      if (a.key === "no-host") return 1;
      if (b.key === "no-host") return -1;
    }
    return a.label.localeCompare(b.label) || a.key.localeCompare(b.key);
  });
}

/** Sessions of one day, in start order. */
export function onDay(entries: readonly Entry[], day: string, timeZone: string): Entry[] {
  return entries.filter((entry) => dayKey(entry.starts_at, timeZone) === day).sort(byStart);
}

export function byStart(a: Entry, b: Entry): number {
  return Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id);
}

/* ---------- The Day grid ---------- */

/** The default hour axis, 06 to 22. It grows when a session falls outside it. */
export const AXIS_START = 6;
export const AXIS_END = 22;
/** A session shorter than this is drawn this tall, so its text stays readable. */
export const MIN_MINUTES = 30;

export function minutesOfDay(iso: string, timeZone: string): number {
  const [hours = 0, minutes = 0] = clockTime(iso, timeZone).split(":").map(Number);
  return hours * 60 + minutes;
}

export interface Placed {
  entry: Entry;
  /** Minutes after midnight. */
  start: number;
  /** The drawn end, at least `MIN_MINUTES` after the start and no later than midnight. */
  end: number;
  lane: number;
  lanes: number;
}

/**
 * Where each session of one column sits. Sessions that overlap share the
 * column side by side: each takes the first free lane, and a cluster of
 * overlapping sessions splits the width evenly.
 */
export function placeColumn(entries: readonly Entry[], timeZone: string): Placed[] {
  const sorted = [...entries].sort(byStart);
  const placed: Placed[] = sorted.map((entry) => {
    const start = minutesOfDay(entry.starts_at, timeZone);
    const length = Math.max(0, Math.round((Date.parse(entry.ends_at) - Date.parse(entry.starts_at)) / 60000));
    return { entry, start, end: Math.min(24 * 60, start + Math.max(MIN_MINUTES, length)), lane: 0, lanes: 1 };
  });
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const close = () => {
    const lanes = Math.max(1, ...cluster.map((item) => item.lane + 1));
    for (const item of cluster) item.lanes = lanes;
    cluster = [];
  };
  for (const item of placed) {
    if (cluster.length && item.start >= clusterEnd) close();
    const taken = new Set(cluster.filter((other) => other.end > item.start).map((other) => other.lane));
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  close();
  return placed;
}

/** The hour axis for these sessions: 06 to 22, widened to whole hours that hold every session. */
export function axisFor(placed: readonly Placed[]): { start: number; end: number } {
  let start = AXIS_START;
  let end = AXIS_END;
  for (const item of placed) {
    start = Math.min(start, Math.floor(item.start / 60));
    end = Math.max(end, Math.ceil(item.end / 60));
  }
  return { start, end: Math.min(24, end) };
}

/** "06", "07", … for the axis labels. */
export function hourLabel(hour: number): string {
  return String(hour).padStart(2, "0");
}

/** Minutes after midnight in the gym's time zone, only when `now` is on `day`. */
export function nowMinutes(day: string, now: Date, timeZone: string): number | null {
  return dayKey(now.toISOString(), timeZone) === day ? minutesOfDay(now.toISOString(), timeZone) : null;
}

/* ---------- Block content ---------- */

export type BlockTone = "class" | "appointment" | "event";

/** What the block says about booking. Rails sends counts, not names: an appointment is "Booked" or "Open". */
export function blockStatus(entry: Entry, now: Date): string {
  const state = sessionState(entry, now);
  const { kind } = entry.program;
  if (state === "cancelled") return entry.cancel_reason ? `Cancelled · ${entry.cancel_reason}` : "Cancelled";
  if (kind === "appointment") return entry.spots_taken > 0 ? "Booked" : "Open";
  if (kind === "event") return `${entry.spots_taken} of ${entry.capacity} sold`;
  return `${entry.spots_taken} of ${entry.capacity}`;
}

/** "Yoga Flow, Group class, 19:00 to 20:00, host Daniel Wong, 9 of 12 booked": the block's accessible name. */
export function blockLabel(entry: Entry, timeZone: string, kindLabel: string, now: Date): string {
  const state = sessionState(entry, now);
  const parts = [
    entry.program.name,
    kindLabel,
    `${clockTime(entry.starts_at, timeZone)} to ${clockTime(entry.ends_at, timeZone)}`,
    entry.program.host_name ? `host ${entry.program.host_name}` : "no host",
  ];
  if (state === "cancelled") parts.push(entry.cancel_reason ? `cancelled, ${entry.cancel_reason}` : "cancelled");
  else if (entry.program.kind === "appointment") parts.push(entry.spots_taken > 0 ? "booked" : "open");
  else if (entry.program.kind === "event") parts.push(`${entry.spots_taken} of ${entry.capacity} tickets sold`);
  else parts.push(`${entry.spots_taken} of ${entry.capacity} booked`);
  if (state === "full" && entry.program.kind !== "appointment") parts.push("full");
  if (state === "ended") parts.push("ended");
  return parts.join(", ");
}

export type { SessionState };

/* ---------- Keyboard ---------- */

/** One block on the grid: its column (x), its row (y, always 0 on Day), and its start. */
export interface NavItem {
  id: string;
  x: number;
  y: number;
  start: number;
}

function cell(items: readonly NavItem[], x: number, y: number): NavItem[] {
  return items.filter((item) => item.x === x && item.y === y).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}

function nearest(candidates: readonly NavItem[], start: number): NavItem | undefined {
  return [...candidates].sort((a, b) => Math.abs(a.start - start) - Math.abs(b.start - start) || a.start - b.start)[0];
}

/**
 * The block an arrow key moves to, or null when the key stays put.
 * Up and Down walk one column or one day cell in time order, then step to the
 * next row on Week. Left and Right move to the nearest column that has a
 * session in the same row, and pick the session closest in time. Home and End
 * jump to the first and last session of the cell.
 */
export function moveFocus(items: readonly NavItem[], currentId: string, key: string): string | null {
  const current = items.find((item) => item.id === currentId);
  if (!current) return null;
  const here = cell(items, current.x, current.y);
  const index = here.findIndex((item) => item.id === current.id);
  switch (key) {
    case "ArrowDown":
    case "ArrowUp": {
      const step = key === "ArrowDown" ? 1 : -1;
      const neighbour = here[index + step];
      if (neighbour) return neighbour.id;
      const rows = [...new Set(items.filter((item) => item.x === current.x).map((item) => item.y))].sort((a, b) => a - b);
      const next = step > 0 ? rows.find((y) => y > current.y) : [...rows].reverse().find((y) => y < current.y);
      if (next === undefined) return null;
      const cells = cell(items, current.x, next);
      return (step > 0 ? cells[0] : cells[cells.length - 1])?.id ?? null;
    }
    case "ArrowRight":
    case "ArrowLeft": {
      const columns = [...new Set(items.filter((item) => item.y === current.y).map((item) => item.x))].sort((a, b) => a - b);
      const next = key === "ArrowRight" ? columns.find((x) => x > current.x) : [...columns].reverse().find((x) => x < current.x);
      if (next === undefined) return null;
      return nearest(cell(items, next, current.y), current.start)?.id ?? null;
    }
    case "Home":
      return here[0]?.id !== current.id ? (here[0]?.id ?? null) : null;
    case "End":
      return here[here.length - 1]?.id !== current.id ? (here[here.length - 1]?.id ?? null) : null;
    default:
      return null;
  }
}

/** The first block in reading order: by row, then column, then start. The one tab stop before an arrow key moves it. */
export function firstItem(items: readonly NavItem[]): string | null {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x || a.start - b.start || a.id.localeCompare(b.id))[0]?.id ?? null;
}
