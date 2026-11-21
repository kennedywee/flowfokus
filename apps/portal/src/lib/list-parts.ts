/*
 * The rules of the shared list parts (`components/parts`): sort state, the
 * filter operator, row selection and its merged band, and the activity feed.
 * Each is plain data in, plain data out, so the parts only draw it.
 */

export type SortDirection = "asc" | "desc";
export interface SortState {
  column: string;
  direction: SortDirection;
}

/** A click on a sortable header: the same column flips, a new column starts ascending. */
export function nextSort(current: SortState | null, column: string): SortState {
  if (current?.column === column) return { column, direction: current.direction === "asc" ? "desc" : "asc" };
  return { column, direction: "asc" };
}

/** The `aria-sort` value of a column header. Only the sorted column has one. */
export function ariaSort(current: SortState | null, column: string): "ascending" | "descending" | undefined {
  if (current?.column !== column) return undefined;
  return current.direction === "asc" ? "ascending" : "descending";
}

/**
 * Where a row sits in a run of selected rows. Adjacent selected rows share one
 * band, so only the first row rounds its top corners and the last its bottom
 * corners. A lone selected row rounds all four. A row that is not selected has
 * no position.
 */
export type BandPosition = "alone" | "first" | "middle" | "last";

export function bandPositions(selected: readonly boolean[]): (BandPosition | null)[] {
  return selected.map((on, index) => {
    if (!on) return null;
    const above = index > 0 && selected[index - 1];
    const below = index < selected.length - 1 && selected[index + 1];
    if (above && below) return "middle";
    if (above) return "last";
    if (below) return "first";
    return "alone";
  });
}

/** The header checkbox for a list: none, some (mixed), or all rows chosen. */
export function selectionState(chosen: number, total: number): { checked: boolean; indeterminate: boolean } {
  if (total === 0 || chosen === 0) return { checked: false, indeterminate: false };
  if (chosen >= total) return { checked: true, indeterminate: false };
  return { checked: false, indeterminate: true };
}

/** The floating bar's count: "2 selected". Read out by a live region. */
export function selectedLabel(count: number): string {
  return `${count} selected`;
}

/** A new set with one id added or removed. The old set stays as it was. */
export function toggleId(ids: ReadonlySet<string>, id: string, on = !ids.has(id)): Set<string> {
  const next = new Set(ids);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

/** Shift-click: every row from the anchor to the clicked row, in list order. */
export function rangeIds(order: readonly string[], anchor: string, target: string): string[] {
  const from = order.indexOf(anchor);
  const to = order.indexOf(target);
  if (from < 0 || to < 0) return [target];
  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}

/**
 * A filter chip's meaning. Positive or negative, one value or several. The
 * chip shows "is", "is not", "is any of", or "is none of"; a click on the
 * operator flips the sign and keeps the values.
 */
export interface ActiveFilter {
  field: string;
  values: readonly string[];
  negated?: boolean;
}

export type FilterOperator = "is" | "is not" | "is any of" | "is none of";

export function filterOperator(filter: Pick<ActiveFilter, "values" | "negated">): FilterOperator {
  const many = filter.values.length > 1;
  if (filter.negated) return many ? "is none of" : "is not";
  return many ? "is any of" : "is";
}

export function toggleOperator<F extends ActiveFilter>(filter: F): F {
  return { ...filter, negated: !filter.negated };
}

/** True when a row's value passes a filter. */
export function matchesFilter(filter: ActiveFilter, value: string): boolean {
  const hit = filter.values.includes(value);
  return filter.negated ? !hit : hit;
}

/** The next values of a filter after one value is checked or unchecked. An empty result removes the filter. */
export function withValue(filter: ActiveFilter | undefined, field: string, value: string, on: boolean): ActiveFilter | null {
  const values = new Set(filter?.values ?? []);
  if (on) values.add(value);
  else values.delete(value);
  if (values.size === 0) return null;
  return { field, values: [...values], negated: filter?.negated };
}

/** Earlier events fold behind "Show N earlier events"; the newest stay in view. */
export function splitEvents<T>(events: readonly T[], visible: number): { shown: T[]; hidden: number } {
  const shown = events.slice(0, Math.max(0, visible));
  return { shown, hidden: events.length - shown.length };
}

export function earlierLabel(hidden: number): string {
  return `Show ${hidden} earlier ${hidden === 1 ? "event" : "events"}`;
}

export type ActivityFilter = "all" | "comments" | "activity";

export function filterFeed<T extends { kind: "event" | "comment" }>(items: readonly T[], filter: ActivityFilter): T[] {
  if (filter === "all") return [...items];
  return items.filter((item) => (filter === "comments" ? item.kind === "comment" : item.kind === "event"));
}

/** A pass's credit ring: amber at two or fewer left, and at none. */
export type CreditTone = "ok" | "low";

export function creditTone(left: number): CreditTone {
  return left <= 2 ? "low" : "ok";
}

/** The slice of a pie that is filled, from twelve o'clock clockwise, as an SVG path in a 16px box. */
export function pieSlice(fraction: number, radius = 4, center = 8): string {
  const part = Math.min(1, Math.max(0, fraction));
  if (part === 0) return "";
  if (part === 1) return `M${center} ${center - radius}A${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius}Z`;
  const angle = part * 2 * Math.PI;
  const x = round(center + radius * Math.sin(angle));
  const y = round(center - radius * Math.cos(angle));
  const large = part > 0.5 ? 1 : 0;
  return `M${center} ${center}V${center - radius}A${radius} ${radius} 0 ${large} 1 ${x} ${y}Z`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** One spot in a spot stack. */
export type SpotKind = "booked" | "open" | "full" | "past";

/**
 * The spots of one session, bottom to top: booked first, then open. A full
 * session is amber all the way; a past session is grey for the spots that
 * were booked.
 */
export function spotKinds(capacity: number, booked: number, state: "upcoming" | "past" = "upcoming"): SpotKind[] {
  const total = Math.max(0, Math.floor(capacity));
  const taken = Math.min(total, Math.max(0, Math.floor(booked)));
  const full = total > 0 && taken >= total;
  return Array.from({ length: total }, (_, index) => {
    if (index >= taken) return "open";
    if (state === "past") return "past";
    return full ? "full" : "booked";
  });
}

/** Shares as whole percentages of a total, for the mix bar. Empty shares count as zero. */
export function mixShares(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + Math.max(0, count), 0);
  if (total === 0) return counts.map(() => 0);
  return counts.map((count) => Math.round((Math.max(0, count) / total) * 100));
}
