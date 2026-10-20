/**
 * Sections that the sidebar shows but the portal does not build yet. They all open
 * one placeholder page, `/$org/soon?page=<key>`.
 */
export const SOON_PAGES = {
  inbox: "Inbox",
  agents: "Agents",
  "check-in": "Check-in",
  reports: "Reports",
  settings: "Settings",
  branches: "Branches",
  changelog: "Changelog",
} as const;

export type SoonPage = keyof typeof SOON_PAGES;

/** Return the page key when it is a known one. Any other value is dropped. */
export function parseSoonPage(value: unknown): SoonPage | undefined {
  return typeof value === "string" && Object.hasOwn(SOON_PAGES, value) ? (value as SoonPage) : undefined;
}
