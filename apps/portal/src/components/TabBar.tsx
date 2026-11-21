import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, MoreHorizontal, Receipt, Users, type LucideIcon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

type Tab = { label: string; icon: LucideIcon; to: "/$org/schedule" | "/$org/members" | "/$org/sales"; path: string };

const TABS: Tab[] = [
  { label: "Schedule", icon: CalendarClock, to: "/$org/schedule", path: "/schedule" },
  { label: "Members", icon: Users, to: "/$org/members", path: "/members" },
  { label: "Sales", icon: Receipt, to: "/$org/sales", path: "/sales" },
];

/** Full-page create and edit forms hide the tab bar on phones, as in Paper. */
const CREATE_FORMS = ["/members/new", "/sales/new", "/programs/new", "/products/new"];
const EDIT_FORM = /^\/(programs|products)\/[^/]+\/edit$/;

/** The tab that owns a page. Pages reached from More select More. */
export function ownerTab(pathname: string, slug: string): string {
  const base = `/${slug}`;
  const rest = pathname.replace(/\/$/, "").slice(base.length);
  const tab = TABS.find((item) => rest === item.path || rest.startsWith(`${item.path}/`));
  return tab?.label ?? "More";
}

export function hidesTabBar(pathname: string, slug: string): boolean {
  const rest = pathname.replace(/\/$/, "").slice(`/${slug}`.length);
  return CREATE_FORMS.includes(rest) || EDIT_FORM.test(rest);
}

/**
 * The phone tab bar: Schedule, Members, Sales, and More. More opens
 * the navigation drawer, which holds every page and the account menu. CSS
 * shows the bar below 768px only.
 */
export function TabBar({ slug }: { slug: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { openMobile, setOpenMobile } = useSidebar();
  if (hidesTabBar(pathname, slug)) return null;
  // The router marks the tab that owns the page (aria-current). More owns the rest.
  const onMore = openMobile || ownerTab(pathname, slug) === "More";

  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          params={{ org: slug }}
          className="tab-bar__tab"
        >
          <span className="tab-bar__icon">
            <tab.icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
          </span>
          {tab.label}
        </Link>
      ))}
      <button
        type="button"
        className="tab-bar__tab"
        aria-controls="app-sidebar"
        aria-expanded={openMobile}
        data-current={onMore || undefined}
        onClick={() => setOpenMobile(true)}
      >
        <span className="tab-bar__icon">
          <MoreHorizontal strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </span>
        More
      </button>
    </nav>
  );
}
