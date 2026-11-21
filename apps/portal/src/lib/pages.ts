import type { Permission } from "@flowfokus/api";
import type { IconName } from "@/components/ui/icon";

/** The pages in the sidebar, as route paths. */
export type PagePath = "/$org/schedule" | "/$org/members" | "/$org/sales" | "/$org/programs" | "/$org/products";

export type Page = {
  label: string;
  icon: IconName;
  to: PagePath;
  /** The path after `/<org>`. */
  path: string;
  /** What Rails asks for to read the page. A role without it sees no sidebar item. */
  permission: Permission;
};

/**
 * The five pages, in sidebar order. Calendar opens today's schedule; the route
 * is renamed in the Calendar issue (#91). Rails still checks every request:
 * the permission only hides a page the person cannot open.
 */
export const PAGES: readonly Page[] = [
  { label: "Calendar", icon: "schedule", to: "/$org/schedule", path: "/schedule", permission: "programs:read" },
  { label: "Members", icon: "members", to: "/$org/members", path: "/members", permission: "members:read" },
  { label: "Sales", icon: "sales", to: "/$org/sales", path: "/sales", permission: "purchases:read" },
  { label: "Programs", icon: "programs", to: "/$org/programs", path: "/programs", permission: "programs:read" },
  { label: "Products", icon: "products", to: "/$org/products", path: "/products", permission: "products:read" },
];

/** The pages this person can read, in sidebar order. */
export function readablePages(permissions: readonly Permission[]): Page[] {
  return PAGES.filter((page) => permissions.includes(page.permission));
}

/**
 * The page `/<org>` opens, and where pages that left the product send people:
 * the first page in the sidebar the person can read. Null when they can read
 * none, for example a role that only manages settings.
 */
export function startPage(permissions: readonly Permission[]): Page | null {
  return readablePages(permissions)[0] ?? null;
}
