import { formatMoney, type Schemas } from "@flowfokus/api";

export { formatMoney };

/** A price's term. A ticket has none: it is for one time. */
export function formatDuration(days: number | null): string {
  if (days === null) return "One time";
  if (days === 7) return "7 days";
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatUsage(limit: number | null): string {
  if (limit === null) return "Unlimited visits";
  return limit === 1 ? "1 visit per period" : `${limit} visits per period`;
}

export const PROGRAM_KIND_LABEL: Record<Schemas["ProgramKind"], string> = {
  group_class: "Class",
  event: "Event",
  appointment: "Appointment",
};

const PROGRAM_KIND_PLURAL: Record<Schemas["ProgramKind"], string> = {
  group_class: "group classes",
  event: "events",
  appointment: "appointments",
};

/** What a public benefit includes, in words. */
export function describeBenefit(benefit: Schemas["PublicBenefit"]): string {
  const where = benefit.location_name ?? "every location";
  if (benefit.kind === "gym_access") return `${benefit.name}: ${formatUsage(benefit.usage_limit)}, ${where}`;
  const uses = benefit.usage_limit === null ? "Unlimited bookings" : `${benefit.usage_limit} bookings`;
  const programs = benefit.program_names.length
    ? benefit.program_names.join(", ")
    : benefit.program_kind
      ? `all ${PROGRAM_KIND_PLURAL[benefit.program_kind]}`
      : "every class, event, and appointment";
  return `${benefit.name}: ${uses} for ${programs}`;
}

/** "A", "A and B", "A, B, and C". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}
