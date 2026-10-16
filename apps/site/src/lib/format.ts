import { formatMoney } from "@hydraflow/api";

export { formatMoney };

export function formatDuration(days: number): string {
  if (days === 7) return "7 days";
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatUsage(limit: number | null): string {
  if (limit === null) return "Unlimited visits";
  return limit === 1 ? "1 visit per period" : `${limit} visits per period`;
}

/** "A", "A and B", "A, B, and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}
