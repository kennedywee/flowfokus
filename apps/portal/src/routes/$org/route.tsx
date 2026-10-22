import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, notFound, rootRouteId, useLoaderData, useRouter, useRouterState } from "@tanstack/react-router";
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
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Search,
  Sparkle,
  Sun,
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
import { setTheme } from "../../lib/theme.functions";
import { isSlug, type Theme } from "../../lib/validate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

  // The current page, for the breadcrumb. A section page has a link back to its root on detail pages.
  const crumb: { label: string; section?: RoutedPath } | null = routed
    ? routed.exact || atSectionRoot ? { label: routed.label } : { label: routed.label, section: routed.to }
    : trimmed === `${base}/changelog` ? { label: "Changelog" }
    : null;

  return (
    <SidebarProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppSidebar data={data} />
      <SidebarInset>
        <header className="topbar">
          <div className="topbar__start">
            <SidebarTrigger className="nav-toggle" aria-controls="app-sidebar">
              <Menu strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="visually-hidden">Navigation menu</span>
            </SidebarTrigger>
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
                  <button type="button" className="switcher__action">
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
                    <button type="button" className="switcher__action">
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
      </SidebarInset>
    </SidebarProvider>
  );
}

/**
 * The sidebar: logo, the staff pages, and What's new. It lives inside the
 * sidebar provider, so it can close the phone drawer after a link is used.
 */
function AppSidebar({ data }: { data: OrganizationData }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { open, isRail, setOpenMobile } = useSidebar();
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const closeDrawer = () => setOpenMobile(false);

  // A link inside the drawer was used. Close it, so the new page shows.
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <Sidebar id="app-sidebar">
      <SidebarHeader>
        <Link
          to="/$org"
          params={{ org: data.slug }}
          activeOptions={{ exact: true }}
          className="sidebar__logo"
          onClick={closeDrawer}
        >
          <Wordmark />
        </Link>
        <SidebarTrigger
          className="sidebar__collapse"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-controls="app-sidebar"
        >
          <img className="sidebar__collapse-mark" src={markUrl} width={26} height={26} alt="" />
          <PanelLeftClose className="sidebar__collapse-close" strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <PanelLeftOpen className="sidebar__collapse-open" strokeWidth={1.75} aria-hidden="true" focusable="false" />
        </SidebarTrigger>
        <button type="button" className="sidebar__close" onClick={closeDrawer}>
          <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <span className="visually-hidden">Close navigation</span>
        </button>
      </SidebarHeader>
      <SidebarContent aria-label="Staff pages">
        {/* The first group has no visible title. In the rail, later titles become dividers. */}
        {NAV_GROUPS.map((group, index) => {
          const labelId = `nav-${group.label.toLowerCase()}`;
          return (
            <SidebarGroup key={group.label}>
              {index === 0 ? (
                <p className="visually-hidden" id={labelId}>
                  {group.label}
                </p>
              ) : (
                <SidebarGroupLabel id={labelId}>{group.label}</SidebarGroupLabel>
              )}
              <SidebarMenu aria-labelledby={labelId}>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    {/* The router marks the active link (aria-current="page"). A section stays active on its detail pages. */}
                    <SidebarMenuButton
                      tooltip={item.label}
                      render={
                        <Link
                          to={item.to}
                          params={{ org: data.slug }}
                          activeOptions={{ exact: item.exact }}
                          onClick={closeDrawer}
                        />
                      }
                    >
                      <item.icon strokeWidth={1.75} aria-hidden="true" focusable="false" />
                      <span className="nav-item__label">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
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
                onClick={closeDrawer}
              >
                Changelog
                <ArrowRight strokeWidth={2} aria-hidden="true" focusable="false" />
              </Link>
            </div>
          </aside>
          {/* On the rail the card becomes one icon with a dot. */}
          <Tooltip disabled={!isRail}>
            <TooltipTrigger
              render={
                <Link
                  to="/$org/changelog"
                  params={{ org: data.slug }}
                  activeOptions={{ exact: true }}
                  className="whatsnew-rail"
                  onClick={closeDrawer}
                />
              }
            >
              <Sparkle strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="whatsnew-rail__dot" aria-hidden="true" />
              <span className="visually-hidden">What&rsquo;s new</span>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              What&rsquo;s new
            </TooltipContent>
          </Tooltip>
        </>
      ) : null}
    </Sidebar>
  );
}

const THEME_CHOICES: ReadonlyArray<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Monitor },
];

/** Sets the class that tokens.css reads. No class means follow the operating system. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
}

/**
 * The account menu, on the shadcn dropdown menu. The theme choice works. Help,
 * account settings, and sign-out respond like menu items, but do nothing yet:
 * they need real sign-in.
 */
function AccountMenu({ actor }: { actor: OrganizationData["actor"] }) {
  const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;
  // The items do nothing yet, so a click leaves the menu open.
  const item = { closeOnClick: false } as const;
  const router = useRouter();
  const toast = useToast();
  const saved = useLoaderData({ from: rootRouteId });
  // Shown at once, before the cookie is saved and the root route reloads.
  const [pending, setPending] = useState<Theme | null>(null);
  const theme = pending ?? saved;
  const current = THEME_CHOICES.find((choice) => choice.value === theme)!;

  async function chooseTheme(next: Theme) {
    if (next === theme) return;
    setPending(next);
    applyTheme(next);
    try {
      await setTheme({ data: { theme: next } });
      await router.invalidate({ filter: (match) => match.routeId === rootRouteId });
    } catch {
      applyTheme(saved);
      toast.show({ tone: "error", title: "Theme not changed", body: "The choice was not saved. Try again." });
    } finally {
      setPending(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="account__button">
        <span aria-hidden="true">{initials(actor.name)}</span>
        <span className="visually-hidden">Account: {actor.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuHeader>
          <span className="menu__name">{actor.name}</span>
          <span className="menu__email">{actor.email}</span>
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <DropdownMenuItem {...item}>
          <CircleHelp {...icon} />
          Help &amp; feedback
          <DropdownMenuShortcut>
            <ChevronRight {...icon} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <current.icon {...icon} />
            Theme
            <DropdownMenuShortcut>
              {current.label}
              <ChevronRight {...icon} />
            </DropdownMenuShortcut>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => chooseTheme(value as Theme)}>
              {THEME_CHOICES.map((choice) => (
                <DropdownMenuRadioItem key={choice.value} value={choice.value}>
                  <choice.icon {...icon} />
                  {choice.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem {...item}>
          <CircleUserRound {...icon} />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem {...item}>
          <LogOut {...icon} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
