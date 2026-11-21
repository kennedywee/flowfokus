/** The page `/<org>` opens. Pages that left the product open it too. */
export const START_PAGE = "/$org/schedule";

/** The paths of pages that left the product, after `/<org>`. Old bookmarks still point at them. */
const REMOVED_PAGES = ["inbox", "agents", "check-in", "reports", "changelog", "soon", "settings/integrations"];

/** True for the old URL of a page that left the product. */
export function isRemovedPage(pathname: string, slug: string): boolean {
  const rest = pathname.replace(/\/$/, "").slice(`/${slug}/`.length);
  return pathname.startsWith(`/${slug}/`) && REMOVED_PAGES.includes(rest);
}
