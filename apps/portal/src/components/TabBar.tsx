import { Link, useRouterState } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { useSidebar } from "@/components/ui/sidebar";
import { useCan } from "../lib/organization";
import { PAGES } from "../lib/pages";

/** The first three pages of the sidebar get a tab. Programs and Products are under More. */
const TABS = PAGES.slice(0, 3);

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
 * The phone tab bar: Calendar, Members, Sales, and More. A role that cannot
 * read a page has no tab for it. More opens
 * the navigation drawer, which holds every page and the account menu. CSS
 * shows the bar below 768px only.
 */
export function TabBar({ slug }: { slug: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { openMobile, setOpenMobile } = useSidebar();
  const can = useCan();
  if (hidesTabBar(pathname, slug)) return null;
  // The router marks the tab that owns the page (aria-current). More owns the rest.
  const onMore = openMobile || ownerTab(pathname, slug) === "More";

  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.filter((tab) => can(tab.permission)).map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          params={{ org: slug }}
          className="tab-bar__tab"
        >
          <span className="tab-bar__icon">
            <Icon name={tab.icon} aria-hidden="true" focusable="false" />
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
          <Icon name="more" aria-hidden="true" focusable="false" />
        </span>
        More
      </button>
    </nav>
  );
}
