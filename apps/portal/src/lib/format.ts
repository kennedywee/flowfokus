import { formatMoney, type Schemas } from "@flowfokus/api";
import type { Failure } from "./result";

export { formatMoney };

const LOCALE = "en-MY";

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, dateStyle: "medium" }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone, timeStyle: "short" }).format(new Date(iso));
}

/** Time only for today in the organization's time zone; date and time otherwise. */
export function formatWhen(iso: string, timeZone: string, now: Date = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" });
  return day.format(new Date(iso)) === day.format(now) ? formatTime(iso, timeZone) : formatDateTime(iso, timeZone);
}

/** A price's term. Tickets have none: they last until their session ends. */
export function formatDuration(days: number | null): string {
  if (days === null) return "One booked session";
  if (days === 7) return "7 days (1 week)";
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatUsage(limit: number | null): string {
  if (limit === null) return "Unlimited visits";
  return limit === 1 ? "1 visit per period" : `${limit} visits per period`;
}

export const PROGRAM_KIND_LABEL: Record<Schemas["ProgramKind"], string> = {
  group_class: "Group class",
  event: "Event",
  appointment: "Appointment",
};

/** Plural program kinds, for "All group classes". */
export const PROGRAM_KIND_PLURAL: Record<Schemas["ProgramKind"], string> = {
  group_class: "group classes",
  event: "events",
  appointment: "appointments",
};

export const PRODUCT_KIND_LABEL: Record<Schemas["ProductKind"], string> = {
  membership: "Membership",
  pass: "Pass",
  ticket: "Ticket",
};

/** What a benefit includes: visits for gym access, uses for programs. */
export function formatBenefitUsage(benefit: { kind: Schemas["BenefitKind"]; usage_limit: number | null }): string {
  if (benefit.kind === "gym_access") return formatUsage(benefit.usage_limit);
  if (benefit.usage_limit === null) return "Unlimited bookings";
  return benefit.usage_limit === 1 ? "1 booking" : `${benefit.usage_limit} bookings`;
}

/** Which programs a program_access benefit covers, in words. */
export function formatProgramScope(
  scope: { kind: Schemas["BenefitKind"]; program_ids: string[]; program_kind: Schemas["ProgramKind"] | null },
  programName: (id: string) => string,
): string | null {
  if (scope.kind !== "program_access") return null;
  if (scope.program_ids.length) return scope.program_ids.map(programName).join(", ");
  if (scope.program_kind) return `All ${PROGRAM_KIND_PLURAL[scope.program_kind]}`;
  return "Every program";
}

export const PAYMENT_METHOD_LABEL: Record<Schemas["PaymentMethod"], string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  online: "Online",
};

export const BOOKING_STATUS_LABEL: Record<Schemas["BookingStatus"], string> = {
  held: "Held for payment",
  confirmed: "Booked",
  attended: "Attended",
  cancelled: "Cancelled",
  expired: "Hold expired",
};

export const PAYMENT_STATUS_LABEL: Record<Schemas["PaymentStatus"], string> = {
  unpaid: "Unpaid",
  partially_paid: "Part paid",
  paid: "Paid",
  void: "Void",
};

/** What a denial means at the desk, and what staff can do next. */
export const DENIAL: Record<Schemas["DenialReason"], { title: string; next: string }> = {
  no_entitlement: {
    title: "No active membership right",
    next: "Nothing covers this time. Sell a membership, or fulfill a paid sale first.",
  },
  location_not_allowed: {
    title: "Not valid at this location",
    next: "Their membership covers other locations only.",
  },
  usage_limit_reached: {
    title: "No visits left this period",
    next: "Every visit in the current period is used. A new period starts after renewal.",
  },
};

/**
 * A short, specific message for a failed call, in staff words. It never names
 * the API, Rails, or the database. Field errors are shown by the form.
 */
export function failureMessage(error: Failure): string {
  switch (error.code) {
    case "access_unavailable":
      return "Staff sign-in is not available, so this action is turned off.";
    case "api_not_configured":
      return "This portal is not set up yet. Ask your administrator.";
    case "api_unreachable":
      return "Check the connection, then try again.";
    case "organization_mismatch":
      return "You do not have staff access to this organization.";
    case "forbidden":
      return "Your role does not allow this action.";
    case "not_found":
      return "This record was not found in this organization.";
    case "unauthenticated":
    case "invalid_token":
      return "Your sign-in is not valid. Sign in again.";
    case "auth_not_configured":
    case "auth_unavailable":
      return "Sign-in can't be checked right now. Try again in a moment.";
    case "database_unavailable":
      return "Something went wrong on our side. Try again in a moment.";
    case "idempotency_key_reused":
      return "This form was already sent with different values. Reload the page and try again.";
    default:
      return error.message;
  }
}

/** Digits after the decimal point for a currency, for example 2 for MYR. */
export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/**
 * Reads an amount typed by staff, such as `120` or `120.50`, as integer minor
 * units. Returns `null` for anything that is not a plain positive amount.
 */
export function parseAmountToMinor(text: string, currency: string): number | null {
  const digits = currencyDigits(currency);
  const value = text.trim().replace(/,/g, "");
  const pattern = digits > 0 ? new RegExp(`^\\d+(?:\\.\\d{1,${digits}})?$`) : /^\d+$/;
  if (!pattern.test(value)) return null;
  const [whole = "0", fraction = ""] = value.split(".");
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, "0") || "0");
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units as a plain amount for an input field, for example `120.00`. */
export function minorToInput(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  return (minor / 10 ** digits).toFixed(digits);
}
