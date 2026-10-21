import { useEffect, useRef, useState } from "react";
import { Link, Outlet, createFileRoute, notFound, useRouter, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  ChartColumn,
  ChevronRight,
  CircleHelp,
  CircleUserRound,
  Inbox,
  LayoutGrid,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Sparkle,
  Tag,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import markUrl from "../../assets/flowfokus-mark.svg?url";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { Blocked } from "../../components/Blocked";
import { ContextSwitcher } from "../../components/ContextSwitcher";
import { useToast } from "../../components/Toast";
import { FailureNotice, Wordmark, initials } from "../../components/ui";
import { getDeskLocation, setDeskLocation } from "../../lib/desk.functions";
import { useDeskLocation } from "../../lib/organization";
import { getAccess, getStaffOrganization } from "../../lib/staff.functions";
import { isSlug } from "../../lib/validate";

export const Route = createFileRoute("/$org")({
  beforeLoad: ({ params }) => {
    if (!isSlug(params.org)) throw notFound();
  },
  loader: async ({ params }) => {
    const access = await getAccess();
    if (access.kind !== "demo") return { access, organization: null, deskLocationId: null };
    const [organization, deskLocationId] = await Promise.all([
      getStaffOrganization({ data: { slug: params.org } }),
      getDeskLocation({ data: { slug: params.org } }),
    ]);
    return { access, organization, deskLocationId };
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
  | "/$org/changelog";

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
        homeLink
        title={`Cannot open “${org}”`}
        description="Check the address name, or go to the staff portal."
      >
        {organization ? <FailureNotice error={organization.error} title="The organization did not open" /> : null}
      </Blocked>
    );
  }

  return <Shell organization={organization.data} />;
}

type OrganizationData = Extract<Awaited<ReturnType<typeof getStaffOrganization>>, { ok: true }>["data"];

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

  // The desk location shows the new choice at once, while the cookie is saved.
  const router = useRouter();
  const toast = useToast();
  const desk = useDeskLocation();
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const shownLocation = data.locations.find((location) => location.id === pendingLocation) ?? desk;

  async function chooseLocation(id: string) {
    setPendingLocation(id);
    try {
      await setDeskLocation({ data: { slug: data.slug, location_id: id } });
      await router.invalidate();
    } catch {
      toast.show({ tone: "error", title: "Location not changed", body: "The choice was not saved. Try again." });
    } finally {
      setPendingLocation(null);
    }
  }

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
            <img className="sidebar__collapse-mark" src={markUrl} width={26} height={26} alt="" />
            <PanelLeftClose className="sidebar__collapse-close" strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <PanelLeftOpen className="sidebar__collapse-open" strokeWidth={1.75} aria-hidden="true" focusable="false" />
          </button>
          <button ref={closeRef} type="button" className="sidebar__close" onClick={() => closeNav(true)}>
            <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <span className="visually-hidden">Close navigation</span>
          </button>
        </div>
        <nav className="nav" aria-label="Staff pages">
          {/* The first group has no visible title. In the rail, later titles become dividers. */}
          {NAV_GROUPS.map((group, index) => (
            <div className="nav-group" key={group.label}>
              {index === 0 ? (
                <p className="visually-hidden" id={`nav-${group.label.toLowerCase()}`}>
                  {group.label}
                </p>
              ) : (
                <div className="nav-group__head">
                  <p className="nav-group__label" id={`nav-${group.label.toLowerCase()}`}>
                    {group.label}
                  </p>
                </div>
              )}
              <ul className="nav-list" aria-labelledby={`nav-${group.label.toLowerCase()}`}>
                {group.items.map(renderItem)}
              </ul>
            </div>
          ))}
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
            <div className="topbar__context">
              {/* Rails has no list of a person's organizations yet, so the list holds the open one. */}
              <ContextSwitcher
                label="Organization"
                strong
                current={data.name}
                options={[
                  {
                    value: data.slug,
                    label: data.name,
                    detail: `${data.locations.length} ${data.locations.length === 1 ? "location" : "locations"}`,
                  },
                ]}
                value={data.slug}
                onSelect={() => undefined}
                searchLabel="Search organizations"
                emptyText="No organization matches."
                footer={() => (
                  <button type="button" className="switcher__action" disabled>
                    <Plus strokeWidth={1.75} aria-hidden="true" focusable="false" />
                    Create organization
                  </button>
                )}
              />
              <span className="topbar__slash" aria-hidden="true">
                /
              </span>
              {shownLocation ? (
                <ContextSwitcher
                  label="Location"
                  icon={<MapPin strokeWidth={1.75} aria-hidden="true" focusable="false" />}
                  current={shownLocation.name}
                  options={data.locations.map((location) => ({
                    value: location.id,
                    label: location.name,
                    detail: location.address ?? undefined,
                    icon: <MapPin strokeWidth={1.75} aria-hidden="true" focusable="false" />,
                  }))}
                  value={shownLocation.id}
                  onSelect={(id) => void chooseLocation(id)}
                  searchLabel="Search locations"
                  emptyText="No location matches."
                  footer={() => (
                    <button type="button" className="switcher__action" disabled>
                      <Plus strokeWidth={1.75} aria-hidden="true" focusable="false" />
                      Add location
                    </button>
                  )}
                />
              ) : (
                <span className="topbar__none">No locations</span>
              )}
              {crumb ? (
                <>
                  <span className="topbar__slash topbar__slash--page" aria-hidden="true">
                    /
                  </span>
                  <nav className="breadcrumb" aria-label="Breadcrumb">
                    <ol>
                      <li>
                        {crumb.section ? (
                          <Link to={crumb.section} params={{ org: data.slug }} activeOptions={{ exact: true }}>
                            {crumb.label}
                          </Link>
                        ) : (
                          <span aria-current="page">{crumb.label}</span>
                        )}
                      </li>
                    </ol>
                  </nav>
                </>
              ) : null}
            </div>
          </div>
          <div className="topbar__end">
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
 * The account menu. Help, theme choice, account settings, and sign-out look
 * and respond like menu items, but do nothing yet: they need real sign-in.
 * The portal has one theme, dark.
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

  const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

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
          </div>
          <hr className="account__rule" />
          <ul className="account__list">
            <li>
              <button type="button" className="account__item">
                <CircleHelp {...icon} />
                Help &amp; feedback
                <span className="account__meta">
                  <ChevronRight {...icon} />
                </span>
              </button>
            </li>
            <li>
              <button type="button" className="account__item">
                <Monitor {...icon} />
                Theme
                <span className="account__meta">
                  Dark
                  <ChevronRight {...icon} />
                </span>
              </button>
            </li>
            <li>
              <button type="button" className="account__item">
                <CircleUserRound {...icon} />
                Account settings
              </button>
            </li>
          </ul>
          <hr className="account__rule" />
          <ul className="account__list">
            <li>
              <button type="button" className="account__item">
                <LogOut {...icon} />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
