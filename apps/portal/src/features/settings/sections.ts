import type { IconName } from "@/components/ui/icon";

/*
 * The settings pages. Settings is a dialog over the page behind it, so a page
 * is a search value, `?settings=staff`, on any organization address. Profile,
 * Notifications, Payments, and Booking rules wait for Rails (issue #94) and
 * have no item until they are real.
 */

export const SETTINGS_SLUGS = ["appearance", "general", "gym-site", "locations", "staff", "roles"] as const;
export type SettingsSlug = (typeof SETTINGS_SLUGS)[number];

export type SettingsGroup = "You" | "Gym" | "Team";

export interface SettingsPageInfo {
  slug: SettingsSlug;
  label: string;
  icon: IconName;
  group: SettingsGroup;
  /** Other words that find the page in the settings search. */
  keywords: readonly string[];
}

export const SETTINGS_PAGES: readonly SettingsPageInfo[] = [
  { slug: "appearance", label: "Appearance", icon: "appearance", group: "You", keywords: ["theme", "dark", "light", "system"] },
  { slug: "general", label: "General", icon: "general", group: "Gym", keywords: ["name", "time zone", "timezone", "currency"] },
  { slug: "gym-site", label: "Gym site", icon: "gymSite", group: "Gym", keywords: ["website", "public", "publish", "address"] },
  { slug: "locations", label: "Locations", icon: "location", group: "Gym", keywords: ["address", "branch"] },
  { slug: "staff", label: "Staff", icon: "staff", group: "Team", keywords: ["invite", "team", "people", "access"] },
  { slug: "roles", label: "Roles", icon: "roles", group: "Team", keywords: ["permissions", "access"] },
];

export const SETTINGS_GROUPS: readonly SettingsGroup[] = ["You", "Gym", "Team"];

export function isSettingsSlug(value: unknown): value is SettingsSlug {
  return typeof value === "string" && (SETTINGS_SLUGS as readonly string[]).includes(value);
}

export function settingsPage(slug: SettingsSlug): SettingsPageInfo {
  return SETTINGS_PAGES.find((page) => page.slug === slug)!;
}

/** The `settings` search value of an organization address. Anything else is dropped. */
export function readSettingsSearch(search: Record<string, unknown>): { settings?: SettingsSlug } {
  return isSettingsSlug(search.settings) ? { settings: search.settings } : {};
}

/** The pages whose name or keywords hold the query. An empty query keeps every page. */
export function matchSettingsPages(query: string): SettingsPageInfo[] {
  const words = query.trim().toLowerCase();
  if (!words) return [...SETTINGS_PAGES];
  return SETTINGS_PAGES.filter(
    (page) => page.label.toLowerCase().includes(words) || page.keywords.some((keyword) => keyword.includes(words)),
  );
}

/**
 * The page an old settings address opens: `/settings/team`, `/settings/staff`,
 * or `?section=Organization`. Notifications was a sample page; its links open
 * General. Integrations left the product, so it opens nothing.
 */
const OLD_NAMES: Record<string, SettingsSlug> = {
  organization: "general",
  general: "general",
  notifications: "general",
  locations: "locations",
  team: "staff",
  staff: "staff",
  roles: "roles",
  appearance: "appearance",
  "gym-site": "gym-site",
};

export function settingsFromOldLink(value: unknown): SettingsSlug | undefined {
  return typeof value === "string" ? OLD_NAMES[value.trim().toLowerCase()] : undefined;
}

type PageLocation = { pathname: string; search: object };

/**
 * True when a navigation only opens, closes, or changes Settings over the
 * same page. A form's unsaved-changes guard lets it through: the page stays.
 */
export function onlySettingsChanged(current: PageLocation, next: PageLocation): boolean {
  if (current.pathname !== next.pathname) return false;
  const { settings: _a, ...before } = current.search as Record<string, unknown>;
  const { settings: _b, ...after } = next.search as Record<string, unknown>;
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].every((key) => JSON.stringify(before[key]) === JSON.stringify(after[key]));
}
