import { formatMoney, type Schemas } from "@hydraflow/api";
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

export function formatDuration(days: number): string {
  if (days === 7) return "7 days (1 week)";
  return days === 1 ? "1 day" : `${days} days`;
}

export function formatUsage(limit: number | null): string {
  if (limit === null) return "Unlimited visits";
  return limit === 1 ? "1 visit per period" : `${limit} visits per period`;
}

export const PAYMENT_METHOD_LABEL: Record<Schemas["PaymentMethod"], string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
};

export const PAYMENT_STATUS_LABEL: Record<Schemas["PaymentStatus"], string> = {
  unpaid: "Unpaid",
  partially_paid: "Part paid",
  paid: "Paid",
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

/** The lamp state for a sale. */
export function saleState(sale: Schemas["Sale"]): "delivered" | "waiting" | "due" {
  if (sale.fulfilled) return "delivered";
  return sale.balance_minor === 0 ? "waiting" : "due";
}

export function saleStateLabel(sale: Schemas["Sale"]): string {
  if (sale.fulfilled) return "Delivered";
  if (sale.balance_minor === 0) return "Paid, not delivered";
  return PAYMENT_STATUS_LABEL[sale.payment_status];
}

/** A short, specific message for a failed call. Field errors are shown by the form. */
export function failureMessage(error: Failure): string {
  switch (error.code) {
    case "access_unavailable":
      return "Staff sign-in is not available, so this action is turned off.";
    case "api_not_configured":
      return "The API address is not configured for this portal.";
    case "api_unreachable":
      return "The Hydraflow API did not respond. Check that Rails is running, then try again.";
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
      return "The API cannot check staff sign-in right now. Protected actions are turned off.";
    case "database_unavailable":
      return "The database is not available. Try again in a moment.";
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
