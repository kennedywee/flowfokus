import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router";
import { Building2, DoorOpen, Menu, Package, Receipt, Users, X, type LucideIcon } from "lucide-react";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { FailureNotice, Wordmark, buttonClass, initials } from "../../components/ui";
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

type NavItem = {
  to: "/$org" | "/$org/members" | "/$org/sales" | "/$org/products";
  label: string;
  icon: LucideIcon;
  exact: boolean;
  /** The path after the organization slug. */
  path: string;
};

// Check-in is part of the Front desk page, so it has no entry of its own.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Desk", items: [{ to: "/$org", label: "Front desk", icon: DoorOpen, exact: true, path: "" }] },
  {
    label: "Manage",
    items: [
      { to: "/$org/members", label: "Members", icon: Users, exact: false, path: "/members" },
      { to: "/$org/sales", label: "Sales", icon: Receipt, exact: false, path: "/sales" },
      { to: "/$org/products", label: "Offers", icon: Package, exact: false, path: "/products" },
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

type OrganizationData = Extract<ReturnType<typeof Route.useLoaderData>["organization"], { ok: true }>["data"];

function Shell({ organization: data }: { organization: OrganizationData }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [navOpen, setNavOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  const base = `/${data.slug}`;
  const current = NAV_GROUPS.flatMap((group) => group.items).find((item) =>
    item.exact ? pathname.replace(/\/$/, "") === base : pathname.startsWith(`${base}${item.path}`),
  );
  const atSectionRoot = current !== undefined && pathname.replace(/\/$/, "") === `${base}${current.path}`;

  function closeNav(returnFocus: boolean) {
    restoreFocus.current = returnFocus;
    setNavOpen(false);
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

  const locationCount = data.locations.length === 1 ? "1 location" : `${data.locations.length} locations`;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="sidebar" id="app-sidebar" data-open={navOpen}>
        <div className="sidebar__brand">
          <Wordmark />
          <button
            ref={closeRef}
            type="button"
            className="sidebar__close"
            onClick={() => closeNav(true)}
          >
            <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
            <span className="visually-hidden">Close navigation</span>
          </button>
        </div>
        {/* Static text. The portal has no organization switcher; "All organizations" is in the account menu. */}
        <div className="org-switch org-switch--static" data-tooltip={data.name}>
          <span className="org-switch__avatar" aria-hidden="true">
            {initials(data.name)}
          </span>
          <span className="org-switch__text">
            <span className="org-switch__name">{data.name}</span>
            <span className="org-switch__meta">
              {locationCount} · {data.currency}
            </span>
          </span>
        </div>
        <nav className="nav" aria-label="Staff pages">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group__label" id={`nav-${group.label.toLowerCase()}`}>
                {group.label}
              </p>
              <ul className="nav-list" aria-labelledby={`nav-${group.label.toLowerCase()}`}>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      params={{ org: data.slug }}
                      className="nav-item"
                      data-tooltip={item.label}
                      activeOptions={{ exact: item.exact }}
                      activeProps={{ "aria-current": "page" }}
                      onClick={() => {
                        if (navOpen) closeNav(true);
                      }}
                    >
                      <item.icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
                      <span className="nav-item__label">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      {navOpen ? <div className="scrim" onClick={() => closeNav(true)} aria-hidden="true" /> : null}
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
                  {current ? (
                    <Link to="/$org" params={{ org: data.slug }}>
                      {data.name}
                    </Link>
                  ) : (
                    <span aria-current="page">{data.name}</span>
                  )}
                </li>
                {current && current.exact ? (
                  <li>
                    <span aria-current="page">{current.label}</span>
                  </li>
                ) : current ? (
                  <li>
                    {atSectionRoot ? (
                      <span aria-current="page">{current.label}</span>
                    ) : (
                      <Link to={current.to} params={{ org: data.slug }}>
                        {current.label}
                      </Link>
                    )}
                  </li>
                ) : null}
              </ol>
            </nav>
          </div>
          <AccountMenu actor={data.actor} />
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
                  This is not a real sign-in. It works on this computer only and is off in production.
                </span>
              </>
            ) : null}
          </div>
          <hr className="account__rule" />
          <ul className="account__list">
            <li>
              <Link to="/" className="account__item" onClick={() => setOpen(false)}>
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
