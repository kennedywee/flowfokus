/** A fixed list, so the server and the browser render the same options. */
export const TIME_ZONES = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "Asia/Jakarta",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "UTC",
];

/** The list with the organization's own zone first when it is not in the list. */
export function zoneChoices(current: string): string[] {
  return TIME_ZONES.includes(current) ? TIME_ZONES : [current, ...TIME_ZONES];
}

/**
 * "Kuala Lumpur (GMT+8)", as in Paper. The offset is today's, so a zone with
 * summer time shows its current offset.
 */
export function zoneLabel(zone: string, now: Date = new Date()): string {
  const city = zone === "UTC" ? "UTC" : (zone.split("/").pop() ?? zone).replace(/_/g, " ");
  let offset = "";
  try {
    offset =
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? "";
  } catch {
    return city;
  }
  return offset && offset !== city ? `${city} (${offset})` : city;
}

/** The gym site address. The app serves gym sites at <slug>.flowfokus.com. */
export function gymSiteAddress(slug: string): string {
  return `${slug}.flowfokus.com`;
}

/** What the save bar says changed: "Time zone changed", or "2 changes". */
export function changeSummary(changes: { timezone: boolean; published: boolean }): string {
  const names = [changes.timezone ? "Time zone" : null, changes.published ? "Gym site" : null].filter((name) => name !== null);
  if (names.length === 0) return "No changes";
  if (names.length === 1) return `${names[0]} changed`;
  return `${names.length} changes`;
}

/**
 * A location field error from Rails, in Paper's words. Rails says "has already
 * been taken"; Paper says "Another location is already called Bangsar".
 */
export function locationFieldError(messages: string[] | undefined, label: string, typed: string): string | undefined {
  if (!messages?.length) return undefined;
  if (messages.some((message) => /already been taken/.test(message))) {
    return `Another location is already called ${typed.trim().replace(/\s+/g, " ")}`;
  }
  if (messages.some((message) => /blank/.test(message))) return `Enter a ${label.toLowerCase()}`;
  if (messages.some((message) => /too long/.test(message))) return `The ${label.toLowerCase()} is too long`;
  return `${label} ${messages.join(", ")}`;
}

/** "3 locations", "1 location". */
export function locationCount(count: number): string {
  return `${count} ${count === 1 ? "location" : "locations"}`;
}
