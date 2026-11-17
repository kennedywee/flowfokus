import type { Schemas } from "@flowfokus/api";

type CheckIn = Schemas["CheckIn"];
export type CheckInResult = Schemas["CheckInResult"];

/** Short staff words for each denial reason Rails returns. */
export const DENIAL_SHORT: Record<Schemas["DenialReason"], string> = {
  no_entitlement: "No active access",
  location_not_allowed: "Not valid here",
  usage_limit_reached: "No visits left",
};

/**
 * The result column: "Checked in", "Checked in · Let in by staff", or
 * "Denied · No visits left". The words come from the Rails result and reason.
 */
export function resultText(checkIn: Pick<CheckIn, "result" | "denial_reason" | "override_reason">): string {
  if (checkIn.result === "granted") return checkIn.override_reason ? "Checked in · Let in by staff" : "Checked in";
  return checkIn.denial_reason ? `Denied · ${DENIAL_SHORT[checkIn.denial_reason]}` : "Denied";
}

/**
 * The access fact in the denial dialog, from the reason Rails returned. Rails
 * does not say which right failed, so this names the rule, not the product.
 */
export function denialAccess(reason: Schemas["DenialReason"] | null, locationName: string): string {
  switch (reason) {
    case "no_entitlement":
      return "No active access";
    case "location_not_allowed":
      return `Not valid at ${locationName}`;
    case "usage_limit_reached":
      return "No visits left this period";
    default:
      return "No reason given";
  }
}

/** "07:42": a 24-hour clock time in the organization's time zone, as in Paper. */
export function clockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
}

/** Check-ins since midnight in the organization's time zone. Rails sends the latest first. */
export function todayOnly(checkIns: CheckIn[], timeZone: string, now: Date = new Date()): CheckIn[] {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
  const today = day.format(now);
  return checkIns.filter((checkIn) => day.format(new Date(checkIn.checked_in_at)) === today);
}

export const RESULT_FILTERS: { value: CheckInResult; label: string }[] = [
  { value: "granted", label: "Checked in" },
  { value: "denied", label: "Denied" },
];

/** The list URL: `result=denied` and `q=kenji`. */
export interface CheckInsSearch {
  result?: string;
  q?: string;
}

export function readCheckInsSearch(search: Record<string, unknown>): CheckInsSearch {
  const clean: CheckInsSearch = {};
  const results = readResults(typeof search.result === "string" ? search.result : undefined);
  if (results.length) clean.result = results.join(",");
  if (typeof search.q === "string" && search.q.trim()) clean.q = search.q.trim().slice(0, 200);
  return clean;
}

/** The known result values in a `result` parameter, in menu order. */
export function readResults(value: string | undefined): CheckInResult[] {
  const values = new Set((value ?? "").split(","));
  return RESULT_FILTERS.map((item) => item.value).filter((item) => values.has(item));
}

export function resultCounts(checkIns: CheckIn[]): Record<CheckInResult, number> {
  const counts: Record<CheckInResult, number> = { granted: 0, denied: 0 };
  for (const checkIn of checkIns) counts[checkIn.result] += 1;
  return counts;
}

/** Rows that match the result filter and the member search (name or email). */
export function filterCheckIns(checkIns: CheckIn[], results: CheckInResult[], q: string): CheckIn[] {
  const needle = q.trim().toLowerCase();
  return checkIns.filter(
    (checkIn) =>
      (!results.length || results.includes(checkIn.result)) &&
      (!needle ||
        checkIn.member.name.toLowerCase().includes(needle) ||
        checkIn.member.email.toLowerCase().includes(needle)),
  );
}

/** "No denied check-ins match “kenji”", or the plain form without a filter. */
export function noMatchText(results: CheckInResult[], q: string): string {
  const kind = results.length === 1 ? `${results[0] === "denied" ? "denied" : "granted"} check-ins` : "check-ins";
  return q ? `No ${kind} match “${q}”` : `No ${kind} today`;
}

/** The footer: "86 check-ins today · 3 denied", from the Rails day counts. */
export function todayCountText(counts: { granted: number; denied: number }): string {
  const total = counts.granted + counts.denied;
  const head = `${total} ${total === 1 ? "check-in" : "check-ins"} today`;
  return counts.denied ? `${head} · ${counts.denied} denied` : head;
}

/** "Farah" from "Farah Aziz", for the override button and its line. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
