import type { Schemas } from "@flowfokus/api";
import { PROGRAM_KIND_LABEL, currencyDigits } from "../../lib/format";
import { PROGRAM_KINDS } from "../../lib/validate";

type ListItem = Schemas["ProgramListItem"];
type Kind = Schemas["ProgramKind"];

/* ---------- The programs list ---------- */

/** The list URL keeps the filters and the search, so Back and reload keep them. */
export interface ProgramsSearch {
  kind?: string;
  visibility?: string;
  q?: string;
}

export type Visibility = "published" | "staff_only";

export const KIND_FILTERS: { value: Kind; label: string }[] = PROGRAM_KINDS.map((value) => ({ value, label: PROGRAM_KIND_LABEL[value] }));
export const VISIBILITY_FILTERS: { value: Visibility; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "staff_only", label: "Staff only" },
];

export interface ProgramsFilter {
  kind: Kind[];
  visibility: Visibility[];
}

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;
}

export function readProgramsSearch(search: Record<string, unknown>): ProgramsSearch {
  const clean: ProgramsSearch = {};
  const kind = text(search.kind, 100);
  const visibility = text(search.visibility, 100);
  const q = text(search.q, 200);
  if (kind) clean.kind = kind;
  if (visibility) clean.visibility = visibility;
  if (q) clean.q = q;
  return clean;
}

function pick<T extends string>(value: string | undefined, allowed: readonly { value: T }[]): T[] {
  const wanted = new Set((value ?? "").split(","));
  return allowed.map((item) => item.value).filter((item) => wanted.has(item));
}

export function filterFromSearch(search: ProgramsSearch): ProgramsFilter {
  return { kind: pick(search.kind, KIND_FILTERS), visibility: pick(search.visibility, VISIBILITY_FILTERS) };
}

export function visibilityOf(program: Pick<ListItem, "published">): Visibility {
  return program.published ? "published" : "staff_only";
}

/** Programs by name. Filters and the search narrow the list; the search matches the name and the host. */
export function filterPrograms(programs: ListItem[], filter: ProgramsFilter, q: string): ListItem[] {
  const needle = q.trim().toLocaleLowerCase();
  return programs
    .filter((program) => !filter.kind.length || filter.kind.includes(program.kind))
    .filter((program) => !filter.visibility.length || filter.visibility.includes(visibilityOf(program)))
    .filter(
      (program) =>
        !needle ||
        program.name.toLocaleLowerCase().includes(needle) ||
        (program.host_name ?? "").toLocaleLowerCase().includes(needle),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

/** How many programs have each kind and each visibility, for the Filter menu. */
export function programCounts(programs: ListItem[]): Record<Kind | Visibility, number> {
  const counts: Record<Kind | Visibility, number> = { group_class: 0, event: 0, appointment: 0, published: 0, staff_only: 0 };
  for (const program of programs) {
    counts[program.kind] += 1;
    counts[visibilityOf(program)] += 1;
  }
  return counts;
}

/** "1–7 of 7 programs". */
export function programsRange(first: number, shown: number, total: number): string {
  if (total === 0) return "0 programs";
  return `${first + 1}–${first + shown} of ${total} ${total === 1 ? "program" : "programs"}`;
}

/** "30 min", "2 h", or "1 h 30 min". */
export function lengthText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** The Upcoming column: "1 session", "16 sessions", or "None". */
export function upcomingText(count: number): string {
  if (count === 0) return "None";
  return `${count} ${count === 1 ? "session" : "sessions"}`;
}

/* ---------- The program page ---------- */

/** Sessions shown before "Show … more". */
export const SESSION_PREVIEW = 10;

export type PriceState = "on_sale" | "off_sale" | "archived";

/** A ticket price is on sale, off sale, or archived for good. Rails decides each. */
export function priceState(price: Pick<Schemas["Price"], "available" | "archived_at">): PriceState {
  if (price.archived_at) return "archived";
  return price.available ? "on_sale" : "off_sale";
}

export const PRICE_STATE_LABEL: Record<PriceState, string> = { on_sale: "On sale", off_sale: "Off sale", archived: "Archived" };

/** Sessions staff can still book or sell: not cancelled, not started, and not full. */
export function bookableSessions(occurrences: Schemas["Occurrence"][]): Schemas["Occurrence"][] {
  return occurrences.filter((occurrence) => occurrence.bookable);
}

/** Ticket prices staff can sell now. */
export function pricesOnSale(program: Pick<Schemas["ProgramDetail"], "ticket">): Schemas["Price"][] {
  return (program.ticket?.prices ?? []).filter((price) => priceState(price) === "on_sale");
}

/**
 * The gym site schedule, for "View on site". Gym sites live at
 * `<slug>.flowfokus.com`; local development serves them at
 * `<slug>.localhost:4002`, as in compose.yaml.
 */
export function siteScheduleUrl(slug: string, portalHostname: string): string {
  const local = portalHostname === "localhost" || portalHostname === "127.0.0.1" || portalHostname.endsWith(".localhost");
  return local ? `http://${slug}.localhost:4002/schedule` : `https://${slug}.flowfokus.com/schedule`;
}

/* ---------- Adding sessions ---------- */

/** Rails repeats the first date and time weekly for 1 to 26 weeks. */
export const MAX_WEEKS = 26;

/** Today in the gym's time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(now);
}

function dateAt(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** The same weekday, `weeks - 1` weeks after `day`. */
export function lastDate(day: string, weeks: number): string {
  const date = dateAt(day);
  date.setUTCDate(date.getUTCDate() + 7 * (Math.max(weeks, 1) - 1));
  return date.toISOString().slice(0, 10);
}

/** "08:00": the end of a session that starts at `time` and lasts `minutes`. */
export function endClock(time: string, minutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return "";
  const total = (Number(match[1]) * 60 + Number(match[2]) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "Tue 17 Nov", for a YYYY-MM-DD day. */
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(dateAt(day))
    .replace(",", "");
}

/** "Tuesdays", for a YYYY-MM-DD day. */
export function weekdays(day: string): string {
  return `${new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" }).format(dateAt(day))}s`;
}

export interface SessionPlan {
  date: string;
  time: string;
  weeks: number;
}

/** The summary under the schedule fields: "4 sessions" and "Tuesdays, 07:00 · 17 Nov to 8 Dec". */
export function planSummary(plan: SessionPlan): { count: string; detail: string } {
  const count = `${plan.weeks} ${plan.weeks === 1 ? "session" : "sessions"}`;
  if (plan.weeks === 1) return { count, detail: `${dayLabel(plan.date)}, ${plan.time}` };
  const short = (day: string) => dayLabel(day).replace(/^\w+ /, "");
  return { count, detail: `${weekdays(plan.date)}, ${plan.time} · ${short(plan.date)} to ${short(lastDate(plan.date, plan.weeks))}` };
}

export type PlanErrors = Partial<Record<"date" | "time" | "weeks", string>>;

export function checkPlan(plan: { date: string; time: string; weeks: string }): PlanErrors {
  const errors: PlanErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date)) errors.date = "Choose the first date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time)) errors.time = "Choose a start time.";
  if (!/^\d{1,2}$/.test(plan.weeks) || Number(plan.weeks) < 1 || Number(plan.weeks) > MAX_WEEKS) errors.weeks = `Repeat for 1 to ${MAX_WEEKS} weeks.`;
  return errors;
}

/** The toast after Add sessions. Rails skips a session that already exists at that time. */
export function sessionsAdded(added: number, weeks: number, capacity: number): { title: string; body: string } {
  const count = Math.max(added, 0);
  return {
    title: count === 1 ? "1 session added" : `${count} sessions added`,
    body: count < weeks ? "Sessions that already existed were skipped." : `Each session has ${capacity} ${capacity === 1 ? "spot" : "spots"}.`,
  };
}

/* ---------- New program and Edit program ---------- */

export interface ProgramDraft {
  name: string;
  kind: Kind;
  locationId: string;
  host: string;
  duration: string;
  capacity: string;
  description: string;
  published: boolean;
}

export type DraftErrors = Partial<Record<"name" | "location" | "duration" | "capacity", string>>;

/** Lengths in the Length menu. A saved length outside the list is added to it. */
export const LENGTHS = [15, 30, 45, 60, 75, 90, 120, 180, 240];

export function lengthChoices(current: number): number[] {
  return LENGTHS.includes(current) || !Number.isInteger(current) || current < 1 ? LENGTHS : [...LENGTHS, current].sort((a, b) => a - b);
}

/** The checks Rails makes, in staff words, so most mistakes show before a request. */
export function checkDraft(draft: ProgramDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.name.trim()) errors.name = "Enter a name.";
  if (!draft.locationId) errors.location = "Choose where it happens.";
  const capacity = draft.capacity.trim();
  if (!/^\d{1,5}$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 10_000) errors.capacity = "Enter 1 to 10,000.";
  const duration = draft.duration.trim();
  if (!/^\d{1,4}$/.test(duration) || Number(duration) < 1 || Number(duration) > 1_440) errors.duration = "Choose a length.";
  return errors;
}

/** The fields Rails accepts. Note is Rails' description. */
export function draftFields(draft: ProgramDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    location_id: draft.locationId,
    capacity: Number(draft.capacity.trim()),
    duration_minutes: Number(draft.duration.trim()),
    host_name: draft.host.trim() || null,
    published: draft.published,
  };
}

/** A new appointment slot holds one person. */
export function kindCapacity(kind: Kind, capacity: string): string {
  return kind === "appointment" ? "1" : capacity;
}

/** True when the form differs from where it started, so leaving asks first. */
export function draftChanged(draft: ProgramDraft, start: ProgramDraft, planTouched = false): boolean {
  return planTouched || (Object.keys(start) as (keyof ProgramDraft)[]).some((key) => draft[key] !== start[key]);
}

/* ---------- Ticket prices ---------- */

export type TicketErrors = Partial<Record<"label" | "amount", string>>;

export function checkTicket(label: string, amountMinor: number | null, currency: string): TicketErrors {
  const errors: TicketErrors = {};
  if (!label.trim()) errors.label = "Enter a name, for example Drop-in.";
  if (amountMinor === null) errors.amount = currencyDigits(currency) > 0 ? "Enter a price, like 25.50." : "Enter a price, like 25.";
  return errors;
}

/** The field from a Rails `validation_failed` reply, in one sentence. */
export function serverField(messages: string[] | undefined, label: string): string | undefined {
  if (!messages?.length) return undefined;
  return `${label} ${messages.join(", ")}.`;
}
