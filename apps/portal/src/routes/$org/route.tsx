import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Building2,
  ChartColumn,
  ChevronsUpDown,
  Inbox,
  LayoutGrid,
  LogIn,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Settings,
  Sparkle,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import markUrl from "../../assets/flowfokus-mark.svg?url";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { FailureNotice, Pill, Wordmark, buttonClass, initials } from "../../components/ui";
import { getAccess, getStaffOrganization } from "../../lib/staff.functions";
import { isSlug } from "../../lib/validate";

export const Route = createFileRoute("/$org")({
  beforeLoad: ({ params }) => {
    if (!isSlug(params.org)) throw notFound();
  },
  loader: async ({ params }) => {
    const access = await getAccess();
    if (access.kind !== "demo") return { access, organization: null };
    const organization = await getStaffOrganization({ data: { slug: params.org } });
    return { access, organization };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData?.organization?.ok === true
            ? `${loaderData.organization.data.name} · Flowfokus staff`
            : "Flowfokus staff portal",
      },
    ],
  }),
  component: OrganizationLayout,
});

type RoutedPath = "/$org" | "/$org/members" | "/$org/sales" | "/$org/products"
  | "/$org/inbox" | "/$org/agents" | "/$org/check-in" | "/$org/reports" | "/$org/settings"
  | "/$org/branches" | "/$org/changelog";

type NavItem = { label: string; icon: LucideIcon; to: RoutedPath; exact: boolean; path: string };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Desk",
    items: [
      { to: "/$org", label: "Overview", icon: LayoutGrid, exact: true, path: "" },
      { to: "/$org/inbox", label: "Inbox", icon: Inbox, exact: false, path: "/inbox" },
      { to: "/$org/agents", label: "Agents", icon: Bot, exact: false, path: "/agents" },
      { to: "/$org/check-in", label: "Check-in", icon: LogIn, exact: false, path: "/check-in" },
      { to: "/$org/members", label: "Members", icon: Users, exact: false, path: "/members" },
      { to: "/$org/sales", label: "Sales", icon: Receipt, exact: false, path: "/sales" },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/$org/products", label: "Plans & offers", icon: Tag, exact: false, path: "/products" },
      { to: "/$org/reports", label: "Reports", icon: ChartColumn, exact: false, path: "/reports" },
      { to: "/$org/settings", label: "Settings", icon: Settings, exact: false, path: "/settings" },
    ],
  },
];

function OrganizationLayout() {
  const { access, organization } = Route.useLoaderData();
  const { org } = Route.useParams();

  if (access.kind !== "demo") {
    return (
      <Blocked
        title="Staff access is turned off"
        description="Nothing in the portal can open until staff sign-in is set up."
      >
        <AccessUnavailable reason={access.reason} />
      </Blocked>
    );
  }
  if (!organization?.ok) {
    return (
      <Blocked
        title={`Cannot open “${org}”`}
        description="Check the address name, or pick an organization from the list."
      >
        {organization ? <FailureNotice error={organization.error} title="The organization did not open" /> : null}
      </Blocked>
    );
  }

  return <Shell organization={organization.data} />;
}

type OrganizationData = Extract<Awaited<ReturnType<typeof getStaffOrganization>>, { ok: true }>["data"];

/** The first letter of a name, for the organization avatar. */
function firstLetter(name: string): string {
  return (Array.from(name.trim())[0] ?? "?").toUpperCase();
}

/**
 * The branch status ring from the Paper kit. Every branch uses the same one: the
 * portal has no per-branch state yet, so the ring is decoration only.
 */
function BranchRing() {
  const good = { stroke: "var(--color-good)" };
  return (
    <svg className="nav-item__ring" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8" fill="none" strokeWidth="1.75" style={good} />
      <circle cx="12" cy="12" r="3.5" style={{ fill: "var(--color-good)" }} />
    </svg>
  );
}

function Shell({ organization: data }: { organization: OrganizationData }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [navOpen, setNavOpen] = useState(false);
  // The desktop rail. Kept in React state only, so a reload opens the full sidebar.
  const [collapsed, setCollapsed] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  const base = `/${data.slug}`;
  const trimmed = pathname.replace(/\/$/, "");
  const routed = NAV_GROUPS.flatMap((group) => group.items).find(
    (item) => item.to !== undefined && (item.exact ? trimmed === base : pathname.startsWith(`${base}${item.path}`)),
  );
  const atSectionRoot = routed !== undefined && trimmed === `${base}${routed.path}`;
  const locationName = data.locations[0]?.name ?? data.name;

  function closeNav(returnFocus: boolean) {
    restoreFocus.current = returnFocus;
    setNavOpen(false);
  }

  // A link inside the open phone sidebar was used. Close it.
  function onSidebarLink() {
    if (navOpen) closeNav(true);
  }

  // Move focus into the sidebar when it opens, and back to the toggle when it closes.
  useEffect(() => {
    if (navOpen) closeRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      toggleRef.current?.focus();
    }
  }, [navOpen]);

  // A link inside the sidebar was used. Close it, and let the new page start at the top.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNav(true);
    }
    // The sidebar is always visible from 768px, so an open phone menu has no meaning there.
    const wide = window.matchMedia("(min-width: 768px)");
    function onWide(event: MediaQueryListEvent) {
      if (event.matches) closeNav(false);
    }
    document.addEventListener("keydown", onKeyDown);
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      wide.removeEventListener("change", onWide);
    };
  }, [navOpen]);

  function renderItem(item: NavItem) {
    // The router marks the active link (`aria-current="page"`). A section stays active on its detail pages.
    const props = { className: "nav-item", "data-tooltip": item.label, onClick: onSidebarLink };
    const content = (
      <>
        <item.icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
        <span className="nav-item__label">{item.label}</span>
      </>
    );
    return (
      <li key={item.label}>
        <Link to={item.to} params={{ org: data.slug }} activeOptions={{ exact: item.exact }} {...props}>
          {content}
        </Link>
      </li>
    );
  }

  // The current page, for the breadcrumb. A section page has a link back to its root on detail pages.
  const crumb: { label: string; section?: RoutedPath } | null = routed
    ? routed.exact || atSectionRoot ? { label: routed.label } : { label: routed.label, section: routed.to }
    : trimmed === `${base}/branches` ? { label: "Branches" }
    : trimmed === `${base}/changelog` ? { label: "Changelog" }
    : null;

  return (
    <div className="shell" data-collapsed={collapsed}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="sidebar" id="app-sidebar" data-open={navOpen}>
        <div className="sidebar__brand">
          <Link
            to="/$org"
            params={{ org: data.slug }}
            activeOptions={{ exact: true }}
            className="sidebar__logo"
            onClick={onSidebarLink}
          >
            <Wordmark />
          </Link>
          <button
            type="button"
            className="sidebar__collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-controls="app-sidebar"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <img className="sidebar__collapse-mark" src={markUrl} width={22} height={22} alt="" />
            <PanelLeftClose className="sidebar__collapse-close" strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <PanelLeftOpen className="sidebar__collapse-open" strokeWidth={1.75} aria-hidden="true" focusable="false" />
          </button>
          <button ref={closeRef} type="button" className="sidebar__close" onClick={() => closeNav(true)}>
            <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <span className="visually-hidden">Close navigation</span>
          </button>
        </div>
        {/* The portal has no organization switcher. This opens the list of organizations. */}
        <Link to="/" activeOptions={{ exact: true }} className="org-switch" data-tooltip={data.name} onClick={onSidebarLink}>
          <span className="org-switch__avatar" aria-hidden="true">
            {firstLetter(data.name)}
          </span>
          <span className="org-switch__text">
            <span className="org-switch__name">{data.name}</span>
            <span className="org-switch__meta">{locationName}</span>
          </span>
          <ChevronsUpDown className="org-switch__icon" strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <span className="visually-hidden">: switch organization</span>
        </Link>
        <nav className="nav" aria-label="Staff pages">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group__head">
                <p className="nav-group__label" id={`nav-${group.label.toLowerCase()}`}>
                  {group.label}
                </p>
              </div>
              <ul className="nav-list" aria-labelledby={`nav-${group.label.toLowerCase()}`}>
                {group.items.map(renderItem)}
              </ul>
            </div>
          ))}
          <div className="nav-group">
            <div className="nav-group__head">
              <p className="nav-group__label" id="nav-branches">
                Branches
              </p>
              <Link
                to="/$org/branches"
                params={{ org: data.slug }}
                activeOptions={{ exact: true }}
                className="nav-group__add"
                onClick={onSidebarLink}
              >
                <Plus strokeWidth={1.75} aria-hidden="true" focusable="false" />
                <span className="visually-hidden">Add a branch</span>
              </Link>
            </div>
            <ul className="nav-list" aria-labelledby="nav-branches">
              {data.locations.map((location) => (
                <li key={location.id}>
                  <Link
                    to="/$org/branches"
                    params={{ org: data.slug }}
                    hash={`branch-${location.id}`}
                    activeOptions={{ exact: true, includeHash: true }}
                    className="nav-item nav-item--branch"
                    data-tooltip={location.name}
                    onClick={onSidebarLink}
                  >
                    <BranchRing />
                    <span className="nav-item__label">{location.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        {showWhatsNew ? (
          <>
            <aside className="whatsnew" aria-labelledby="whatsnew-title">
              <div className="whatsnew__head">
                <span className="whatsnew__tag">
                  <span className="whatsnew__dot" aria-hidden="true" />
                  What&rsquo;s new
                </span>
                <button type="button" className="whatsnew__dismiss" onClick={() => setShowWhatsNew(false)}>
                  <X strokeWidth={2} aria-hidden="true" focusable="false" />
                  <span className="visually-hidden">Hide what&rsquo;s new</span>
                </button>
              </div>
              <div className="whatsnew__body">
                <p className="whatsnew__title" id="whatsnew-title">
                  New look for the staff portal
                </p>
                <p className="whatsnew__text">Same tasks, new dark design.</p>
              </div>
              <div className="whatsnew__foot">
                <span className="whatsnew__version">v0.4</span>
                <Link
                  to="/$org/changelog"
                  params={{ org: data.slug }}
                  activeOptions={{ exact: true }}
                  className="whatsnew__link"
                  onClick={onSidebarLink}
                >
                  Changelog
                  <ArrowRight strokeWidth={2} aria-hidden="true" focusable="false" />
                </Link>
              </div>
            </aside>
            {/* On the rail the card becomes one icon with a dot. */}
            <Link
              to="/$org/changelog"
              params={{ org: data.slug }}
              activeOptions={{ exact: true }}
              className="whatsnew-rail"
              data-tooltip="What’s new"
              onClick={onSidebarLink}
            >
              <Sparkle strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="whatsnew-rail__dot" aria-hidden="true" />
              <span className="visually-hidden">What&rsquo;s new</span>
            </Link>
          </>
        ) : null}
      </div>
      <div className="scrim" data-open={navOpen} onClick={() => closeNav(true)} aria-hidden="true" />
      <div className="shell__main" inert={navOpen}>
        <header className="topbar">
          <div className="topbar__start">
            <button
              ref={toggleRef}
              type="button"
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="app-sidebar"
              onClick={() => setNavOpen(true)}
            >
              <Menu strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="visually-hidden">Navigation menu</span>
            </button>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li>
                  {crumb && !routed?.exact ? (
                    <Link to="/$org" params={{ org: data.slug }} activeOptions={{ exact: true }}>
                      {locationName}
                    </Link>
                  ) : crumb ? (
                    <span>{locationName}</span>
                  ) : (
                    <span aria-current="page">{locationName}</span>
                  )}
                </li>
                {crumb ? (
                  <li>
                    {crumb.section ? (
                      <Link to={crumb.section} params={{ org: data.slug }} activeOptions={{ exact: true }}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ) : null}
              </ol>
            </nav>
          </div>
          <div className="topbar__end">
            {import.meta.env.DEV ? <span className="preview-global-badge"><Pill>Sample data</Pill></span> : null}
            {/* Visual only for now. The members page has the search. */}
            <Link to="/$org/members" params={{ org: data.slug }} className="topbar__search">
              <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="topbar__search-label">Search</span>
              <kbd className="topbar__kbd" aria-hidden="true">
                ⌘K
              </kbd>
            </Link>
            <AccountMenu actor={data.actor} />
          </div>
        </header>
        <main className="main" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * The account menu. It states only what is true: access is the local demo, not a
 * real sign-in. There is no sign-out, because there is no session to end.
 */
function AccountMenu({ actor }: { actor: OrganizationData["actor"] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div
      className="account"
      ref={root}
      onBlur={(event) => {
        // Close when focus leaves the menu, for example on Tab.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="account__button"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{initials(actor.name)}</span>
        <span className="visually-hidden">Account: {actor.name}</span>
      </button>
      {open ? (
        <div className="account__menu" id="account-menu">
          <div className="account__who">
            <span className="account__name">{actor.name}</span>
            <span className="account__email">{actor.email}</span>
            {actor.demo ? (
              <>
                <span className="demo-tag">Local demo access</span>
                <span className="account__note">
                  {import.meta.env.DEV ? "Frontend preview with sample records. A full reload resets your changes." : "This is not a real sign-in. Demo access is off in production."}
                </span>
              </>
            ) : null}
          </div>
          <hr className="account__rule" />
          <ul className="account__list">
            <li>
              <Link to="/" activeOptions={{ exact: true }} className="account__item" onClick={() => setOpen(false)}>
                <Building2 strokeWidth={1.75} aria-hidden="true" focusable="false" />
                All organizations
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** A page that replaces the whole portal: access is off, or the organization did not open. */
function Blocked({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="entry" id="main">
      <div className="entry__panel">
        <Wordmark />
        <div className="entry__text">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <div className="actions">
          <Link to="/" className={buttonClass({ variant: "secondary" })}>
            Back to the organization list
          </Link>
        </div>
      </div>
    </main>
  );
}
