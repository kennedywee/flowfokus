import { useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  rootRouteId,
  useLoaderData,
  useMatches,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  Bot,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  ChevronRight,
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
  History,
  Settings,
  Sun,
  Tag,
  Ticket,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import markUrl from "../../assets/flowfokus-mark.svg?url";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { Blocked } from "../../components/Blocked";
import { CommandMenu, type CommandPage } from "../../components/CommandMenu";
import { ContextSwitcher } from "../../components/ContextSwitcher";
import { PageActionsSlot } from "../../components/PageActions";
import { SignOutForm, roleLabel, signInHref } from "../../components/Session";
import { useToast } from "../../components/Toast";
import { FailureNotice, Kbd, initials } from "../../components/ui";
import { getDeskLocation, setDeskLocation } from "../../lib/desk.functions";
import { useDeskLocation } from "../../lib/organization";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { getAccess, getStaffOrganization, listMyOrganizations, type StaffOrganizationChoice } from "../../lib/staff.functions";
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
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/$org")({
  beforeLoad: ({ params }) => {
    if (!isSlug(params.org)) throw notFound();
  },
  loader: async ({ params, location }) => {
    const { access } = await getAccess();
    if (access.kind === "unavailable") return { access, organization: null, organizations: null, deskLocationId: null };
    // A full page load, so the server can set the PKCE cookie and leave for WorkOS.
    const toSignIn = () => redirect({ href: signInHref(location.href), reloadDocument: true });

    // The organization loads first: when the session holds another organization,
    // this call switches it, and the calls after it use the new session.
    const organization = await getStaffOrganization({ data: { slug: params.org } });
    if (!organization.ok && organization.error.code === "signed_out") throw toSignIn();
    const [organizations, deskLocationId] = await Promise.all([
      access.kind === "workos" ? listMyOrganizations() : null,
      getDeskLocation({ data: { slug: params.org } }),
    ]);
    return { access, organization, organizations: organizations?.ok ? organizations.data : null, deskLocationId };
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

type RoutedPath = "/$org" | "/$org/members" | "/$org/sales" | "/$org/products" | "/$org/schedule" | "/$org/programs"
  | "/$org/inbox" | "/$org/agents" | "/$org/check-in" | "/$org/reports" | "/$org/settings"
  | "/$org/changelog";

type NavItem = { label: string; icon: LucideIcon; to: RoutedPath; exact: boolean; path: string };

/* One list, no group titles. What's new lives in the account menu. */
const NAV_ITEMS: NavItem[] = [
  { to: "/$org", label: "Overview", icon: LayoutGrid, exact: true, path: "" },
  { to: "/$org/inbox", label: "Inbox", icon: Inbox, exact: false, path: "/inbox" },
  { to: "/$org/agents", label: "Agents", icon: Bot, exact: false, path: "/agents" },
  { to: "/$org/check-in", label: "Check-ins", icon: LogIn, exact: false, path: "/check-in" },
  { to: "/$org/schedule", label: "Schedule", icon: CalendarDays, exact: false, path: "/schedule" },
  { to: "/$org/members", label: "Members", icon: Users, exact: false, path: "/members" },
  { to: "/$org/sales", label: "Sales", icon: Receipt, exact: false, path: "/sales" },
  { to: "/$org/programs", label: "Programs", icon: Ticket, exact: false, path: "/programs" },
  { to: "/$org/products", label: "Plans & offers", icon: Tag, exact: false, path: "/products" },
  { to: "/$org/reports", label: "Reports", icon: ChartColumn, exact: false, path: "/reports" },
];

function OrganizationLayout() {
  const { access, organization, organizations } = Route.useLoaderData();
  const { org } = Route.useParams();

  if (access.kind === "unavailable") {
    return (
      <Blocked
        title="Staff access is turned off"
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
      >
        {organization ? <FailureNotice error={organization.error} title="The organization did not open" /> : null}
        {access.kind === "workos" ? (
          <div className="actions">
            <SignOutForm />
          </div>
        ) : null}
      </Blocked>
    );
  }

  return <Shell organization={organization.data} organizations={organizations} canSignOut={access.kind === "workos"} />;
}

type OrganizationData = Extract<Awaited<ReturnType<typeof getStaffOrganization>>, { ok: true }>["data"];

/**
 * Opens another organization with a full page load. The server then switches
 * the session once, before any page data loads, instead of once per loader.
 */
function openOrganization(slug: string) {
  window.location.assign(`/${encodeURIComponent(slug)}`);
}

function Shell({
  organization: data,
  organizations,
  canSignOut,
}: {
  organization: OrganizationData;
  /** Every organization the signed-in person can open. Null in demo mode or when the list did not load. */
  organizations: StaffOrganizationChoice[] | null;
  canSignOut: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const base = `/${data.slug}`;
  const trimmed = pathname.replace(/\/$/, "");
  const routed = NAV_ITEMS.find((item) => (item.exact ? trimmed === base : pathname.startsWith(`${base}${item.path}`)));
  const atSectionRoot = routed !== undefined && trimmed === `${base}${routed.path}`;

  // The desk location shows the new choice at once, while the cookie is saved.
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const desk = useDeskLocation();
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  const shownLocation = data.locations.find((location) => location.id === pendingLocation) ?? desk;
  const [searching, setSearching] = useState(false);
  // Pages put their actions here, after Search (components/PageActions).
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null);
  const modKey = useModKeyLabel();
  useShortcut("k", () => setSearching((open) => !open), { mod: true });

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

  // A detail page names itself with `staticData.crumb`, for example the member's name.
  const matches = useMatches();
  const pageCrumb = matches.reduce<string | undefined>(
    (found, match) => match.staticData.crumb?.(match.loaderData) ?? found,
    undefined,
  );

  // A page can belong to another section than its path, with a longer trail:
  // a session sits under Programs › its program.
  const sectionOverride = matches.reduce<RoutedPath | undefined>((found, match) => match.staticData.section ?? found, undefined);
  const trail = matches.reduce<{ label: string; program?: string }[] | undefined>(
    (found, match) => match.staticData.trail?.(match.loaderData, data.timezone) ?? found,
    undefined,
  );
  const owner = NAV_ITEMS.find((item) => item.to === sectionOverride);

  // The section, then the page. On a detail page the section links back to its list.
  const section: { label: string; to?: RoutedPath } | null = owner
    ? { label: owner.label, to: owner.to }
    : routed
    ? routed.exact || atSectionRoot ? { label: routed.label } : { label: routed.label, to: routed.to }
    : trimmed === `${base}/changelog` ? { label: "What’s new" }
    : trimmed === `${base}/settings` ? { label: "Settings" }
    : null;

  const role = organizations?.find((choice) => choice.slug === data.slug)?.role;
  const pages: CommandPage[] = [
    ...NAV_ITEMS.map((item) => ({
      label: item.label,
      icon: item.icon,
      open: () => void navigate({ to: item.to, params: { org: data.slug } }),
    })),
    { label: "Settings", icon: Settings, open: () => void navigate({ to: "/$org/settings", params: { org: data.slug } }) },
    { label: "What’s new", icon: History, open: () => void navigate({ to: "/$org/changelog", params: { org: data.slug } }) },
  ];

  return (
    <SidebarProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppSidebar data={data} role={role ? roleLabel(role) : null} canSignOut={canSignOut} activeTo={owner?.to} />
      <SidebarInset>
        <header className="topbar">
          <div className="topbar__start">
            <SidebarTrigger className="nav-toggle" aria-controls="app-sidebar">
              <Menu strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="visually-hidden">Navigation menu</span>
            </SidebarTrigger>
            <div className="topbar__context">
              {/* Demo mode has no list of organizations, so the list holds the open one. */}
              <ContextSwitcher
                label="Organization"
                strong
                icon={<span className="org-tile">{initials(data.name).slice(0, 1)}</span>}
                current={data.name}
                options={
                  organizations && organizations.length > 0
                    ? organizations.map((choice) => ({ value: choice.slug, label: choice.name, detail: roleLabel(choice.role) }))
                    : [
                        {
                          value: data.slug,
                          label: data.name,
                          detail: `${data.locations.length} ${data.locations.length === 1 ? "location" : "locations"}`,
                        },
                      ]
                }
                value={data.slug}
                onSelect={(slug) => {
                  if (slug !== data.slug) openOrganization(slug);
                }}
                searchLabel="Search organizations"
                emptyText="No organization matches."
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
                    <Link to="/$org/settings" params={{ org: data.slug }} search={{ section: "Locations" }} className="switcher__action">
                      <Plus strokeWidth={1.75} aria-hidden="true" focusable="false" />
                      Add location
                    </Link>
                  )}
                />
              ) : (
                <span className="topbar__none">No locations</span>
              )}
              {section ? (
                <>
                  <span className="topbar__slash topbar__slash--page" aria-hidden="true">
                    /
                  </span>
                  <nav className="breadcrumb" aria-label="Breadcrumb">
                    <ol>
                      <li>
                        {section.to ? (
                          <Link to={section.to} params={{ org: data.slug }} activeOptions={{ exact: true }}>
                            {section.label}
                          </Link>
                        ) : (
                          <span aria-current="page">{section.label}</span>
                        )}
                      </li>
                      {section.to && trail
                        ? trail.map((crumb, index) => (
                            <li key={index}>
                              {crumb.program ? (
                                <Link to="/$org/programs/$programId" params={{ org: data.slug, programId: crumb.program }}>
                                  {crumb.label}
                                </Link>
                              ) : (
                                <span aria-current={index === trail.length - 1 ? "page" : undefined}>{crumb.label}</span>
                              )}
                            </li>
                          ))
                        : section.to && pageCrumb ? (
                            <li>
                              <span aria-current="page">{pageCrumb}</span>
                            </li>
                          ) : null}
                    </ol>
                  </nav>
                </>
              ) : null}
            </div>
          </div>
          <div className="topbar__end">
            {/* Search opens from here or with ⌘K. It finds members and pages. */}
            <button
              type="button"
              className="button button--secondary button--compact topbar__search"
              aria-keyshortcuts="Meta+K Control+K"
              aria-haspopup="dialog"
              onClick={() => setSearching(true)}
            >
              <Search strokeWidth={1.75} aria-hidden="true" focusable="false" />
              <span className="visually-hidden">Search</span>
              <Kbd>{modKey}K</Kbd>
            </button>
            <div className="topbar__actions" ref={setActionsSlot} />
          </div>
        </header>
        <main className="main" id="main" tabIndex={-1}>
          <PageActionsSlot.Provider value={actionsSlot}>
            <Outlet />
          </PageActionsSlot.Provider>
        </main>
      </SidebarInset>
      <CommandMenu
        slug={data.slug}
        open={searching}
        onOpenChange={setSearching}
        pages={pages}
        canSearchMembers={data.actor.permissions.includes("members:read")}
      />
    </SidebarProvider>
  );
}

/**
 * The sidebar: the logo, the collapse button, the staff pages, and the account
 * menu. It lives inside the sidebar provider, so it can close the phone drawer
 * after a link is used.
 */
function AppSidebar({
  data,
  role,
  canSignOut,
  activeTo,
}: {
  data: OrganizationData;
  role: string | null;
  canSignOut: boolean;
  /** The section that owns this page, when it is not the section in the path. */
  activeTo?: RoutedPath;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { open, setOpenMobile } = useSidebar();
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
          <img className="sidebar__mark" src={markUrl} width={20} height={20} alt="" />
          <span className="sidebar__name">Flowfokus</span>
        </Link>
        <SidebarTrigger
          className="sidebar__collapse"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          aria-controls="app-sidebar"
        >
          <img className="sidebar__collapse-mark" src={markUrl} width={20} height={20} alt="" />
          <PanelLeftClose className="sidebar__collapse-close" strokeWidth={1.5} aria-hidden="true" focusable="false" />
          <PanelLeftOpen className="sidebar__collapse-open" strokeWidth={1.5} aria-hidden="true" focusable="false" />
        </SidebarTrigger>
        <button type="button" className="sidebar__close" onClick={closeDrawer}>
          <X strokeWidth={1.75} aria-hidden="true" focusable="false" />
          <span className="visually-hidden">Close navigation</span>
        </button>
      </SidebarHeader>
      <SidebarContent aria-label="Staff pages">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.label}>
              {/* The router marks the active link (aria-current="page"). A section stays active on its detail pages. */}
              <SidebarMenuButton
                tooltip={item.label}
                render={
                  <Link
                    to={item.to}
                    params={{ org: data.slug }}
                    activeOptions={{ exact: item.exact || activeTo !== undefined }}
                    inactiveProps={activeTo === item.to ? { "aria-current": "page" } : undefined}
                    onClick={closeDrawer}
                  />
                }
              >
                <item.icon strokeWidth={1.5} aria-hidden="true" focusable="false" />
                <span className="nav-item__label">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <AccountMenu actor={data.actor} role={role} slug={data.slug} canSignOut={canSignOut} onNavigate={closeDrawer} />
      </SidebarFooter>
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
 * The account menu, at the foot of the sidebar. It holds the theme choice,
 * settings, What's new, and sign-out. Sign-out submits a hidden form, so it is
 * a same-origin POST, not a script call.
 */
function AccountMenu({
  actor,
  role,
  slug,
  canSignOut,
  onNavigate,
}: {
  actor: OrganizationData["actor"];
  role: string | null;
  slug: string;
  canSignOut: boolean;
  onNavigate: () => void;
}) {
  const signOutForm = useRef<HTMLFormElement>(null);
  const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;
  const router = useRouter();
  const navigate = useNavigate();
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

  function open(to: "/$org/settings" | "/$org/changelog") {
    onNavigate();
    void navigate({ to, params: { org: slug } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="account__button">
        <span className="account__avatar" aria-hidden="true">
          {initials(actor.name).slice(0, 1)}
        </span>
        <span className="account__name">{actor.name}</span>
        {role ? <span className="account__role">· {role}</span> : null}
        <ChevronDown className="account__chevron" {...icon} />
        <span className="visually-hidden">, account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuHeader>
          <span className="menu__name">{actor.name}</span>
          <span className="menu__email">{actor.email}</span>
        </DropdownMenuHeader>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open("/$org/settings")}>
          <Settings {...icon} />
          Settings
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
        <DropdownMenuItem onClick={() => open("/$org/changelog")}>
          <History {...icon} />
          What’s new
        </DropdownMenuItem>
        {canSignOut ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutForm.current?.requestSubmit()}>
              <LogOut {...icon} />
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
      {canSignOut ? <SignOutForm ref={signOutForm} showButton={false} /> : null}
    </DropdownMenu>
  );
}
