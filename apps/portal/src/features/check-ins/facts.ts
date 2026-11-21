import type { Schemas } from "@flowfokus/api";

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

/** "Farah" from "Farah Aziz", for the override button and its line. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
