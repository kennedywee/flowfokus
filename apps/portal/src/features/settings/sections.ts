/*
 * The settings sections and their addresses. Real sections come first. The
 * sample sections (Notifications, Integrations) live in features/preview and
 * come after them, under their own heading.
 */

export type SettingsPath =
  | "/$org/settings/general"
  | "/$org/settings/locations"
  | "/$org/settings/staff"
  | "/$org/settings/notifications"
  | "/$org/settings/integrations";

export interface SettingsSection {
  label: string;
  to: SettingsPath;
  /** The last part of the address, for example "staff". */
  slug: string;
  sample: boolean;
}

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { label: "General", to: "/$org/settings/general", slug: "general", sample: false },
  { label: "Locations", to: "/$org/settings/locations", slug: "locations", sample: false },
  { label: "Staff", to: "/$org/settings/staff", slug: "staff", sample: false },
  { label: "Notifications", to: "/$org/settings/notifications", slug: "notifications", sample: true },
  { label: "Integrations", to: "/$org/settings/integrations", slug: "integrations", sample: true },
];

/**
 * Old links used `?section=Organization` and `?section=Team`. They still
 * open the right section. Any letter case works. Unknown values open nothing.
 */
const OLD_NAMES: Record<string, SettingsPath> = {
  organization: "/$org/settings/general",
  general: "/$org/settings/general",
  locations: "/$org/settings/locations",
  team: "/$org/settings/staff",
  staff: "/$org/settings/staff",
  notifications: "/$org/settings/notifications",
  integrations: "/$org/settings/integrations",
};

export function sectionFromOldLink(value: unknown): SettingsPath | undefined {
  return typeof value === "string" ? OLD_NAMES[value.trim().toLowerCase()] : undefined;
}

/**
 * The settings section that owns a page. Roles belongs to Staff. Returns
 * undefined outside settings, and for the settings index.
 */
export function settingsSectionFor(pathname: string, slug: string): SettingsSection | undefined {
  const rest = pathname.replace(/\/$/, "").slice(`/${slug}/settings`.length);
  const part = rest.split("/")[1];
  if (part === "roles") return SETTINGS_SECTIONS.find((section) => section.slug === "staff");
  return SETTINGS_SECTIONS.find((section) => section.slug === part);
}

/** True on the settings pages, where the sidebar shows the settings sections. */
export function isSettingsPath(pathname: string, slug: string): boolean {
  const base = `/${slug}/settings`;
  const trimmed = pathname.replace(/\/$/, "");
  return trimmed === base || trimmed.startsWith(`${base}/`);
}
