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
import { Icon, type IconName } from "@/components/ui/icon";
import markUrl from "../../assets/flowfokus-mark.svg?url";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { Blocked } from "../../components/Blocked";
import { CommandMenu, type CommandPage } from "../../components/CommandMenu";
import { ContextSwitcher } from "../../components/ContextSwitcher";
import { KeyboardShortcuts } from "../../components/KeyboardShortcuts";
import { SettingsNav } from "../../features/settings/SettingsNav";
import { isSettingsPath } from "../../features/settings/sections";
import { PageActionsSlot } from "../../components/PageActions";
import { SignOutForm, roleLabel, signInHref } from "../../components/Session";
import { TabBar } from "../../components/TabBar";
import { useToast } from "../../components/Toast";
import { Kbd, initials } from "../../components/ui";
import { getDeskLocation, setDeskLocation } from "../../lib/desk.functions";
import { useDeskLocation } from "../../lib/organization";
import { useModKeyLabel, useShortcut } from "../../lib/shortcuts";
import { getAccess, getStaffOrganization, listMyOrganizations, type StaffOrganizationChoice } from "../../lib/staff.functions";
import { setTheme } from "../../lib/theme.functions";
import { applyTheme } from "../../lib/theme";
import { PAGES, readablePages, type PagePath } from "../../lib/pages";
import { isSlug, type Theme } from "../../lib/validate";
import { buttonVariants } from "@/components/ui/button";
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
    const { access, user } = await getAccess();
    const email = user?.email ?? null;
    if (access.kind === "unavailable") return { access, email, organization: null, organizations: null, deskLocationId: null };
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
    return { access, email, organization, organizations: organizations?.ok ? organizations.data : null, deskLocationId };
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

type RoutedPath = PagePath;

function OrganizationLayout() {
  const { access, email, organization, organizations } = Route.useLoaderData();
  const { org } = Route.useParams();

  if (access.kind === "unavailable") return <AccessUnavailable reason={access.reason} />;
  // Paper "Sign in — Cannot open organization". One line covers a missing organization and a failure.
  if (!organization?.ok) {
    return (
      <Blocked
        title={`Cannot open “${org}”`}
        tone="error"
        message="This organization did not open. It may not exist, or you are not staff there."
        account={access.kind === "workos" ? email : null}
      >
        <Link to="/" className={`${buttonVariants()} entry__action`}>
          Go to the staff portal
        </Link>
      </Blocked>
    );
  }

  return <Shell organization={organization.data} organizations={organizations} canSignOut={access.kind === "workos"} />;
}

/** The letter tile of an organization in the switcher. */
function OrgTile({ name, current }: { name: string; current: boolean }) {
  return (
    <span className="switcher__tile" data-current={current}>
      {initials(name).slice(0, 1)}
    </span>
  );
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
  const routed = PAGES.find((item) => pathname.startsWith(`${base}${item.path}`));
  const atSectionRoot = routed !== undefined && trimmed === `${base}${routed.path}`;
  // Settings has its own sidebar. Its breadcrumb is the organization, then Settings, as in Paper.
  const inSettings = isSettingsPath(pathname, data.slug);

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
  const [shortcuts, setShortcuts] = useState(false);
  useShortcut("k", () => setSearching((open) => !open), { mod: true });
  useShortcut(",", () => void navigate({ to: "/$org/settings", params: { org: data.slug } }), { mod: true });
  useShortcut("?", () => setShortcuts(true));

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
  const owner = PAGES.find((item) => item.to === sectionOverride);

  // The section, then the page. On a detail page the section links back to its list.
  const section: { label: string; to?: RoutedPath } | null = owner
    ? { label: owner.label, to: owner.to }
    : routed
    ? atSectionRoot ? { label: routed.label } : { label: routed.label, to: routed.to }
    : inSettings ? { label: "Settings" }
    : null;

  const pages: CommandPage[] = [
    ...readablePages(data.actor.permissions).map((item) => ({
      label: item.label,
      icon: item.icon,
      open: () => void navigate({ to: item.to, params: { org: data.slug } }),
    })),
    { label: "Settings", icon: "general", open: () => void navigate({ to: "/$org/settings", params: { org: data.slug } }) },
  ];

  return (
    <SidebarProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {/* The rounded window on the tinted frame. Phones drop the frame (styles/shell.css). */}
      <div className="window">
        <AppSidebar data={data} canSignOut={canSignOut} activeTo={owner?.to} onShortcuts={() => setShortcuts(true)} />
        {/* The main column scrolls inside the window, so the router restores its scroll. */}
        <SidebarInset data-scroll-restoration-id="main">
          <header className="topbar">
            <div className="topbar__start">
              <SidebarTrigger className="nav-toggle" aria-controls="app-sidebar">
                <Icon name="sidebar" aria-hidden="true" focusable="false" />
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
                      ? organizations.map((choice) => ({
                          value: choice.slug,
                          label: choice.name,
                          aside: roleLabel(choice.role),
                          icon: <OrgTile name={choice.name} current={choice.slug === data.slug} />,
                        }))
                      : [
                          {
                            value: data.slug,
                            label: data.name,
                            aside: `${data.locations.length} ${data.locations.length === 1 ? "location" : "locations"}`,
                            icon: <OrgTile name={data.name} current />,
                          },
                        ]
                  }
                  value={data.slug}
                  onSelect={(slug) => {
                    if (slug !== data.slug) openOrganization(slug);
                  }}
                  searchLabel="Switch organization…"
                  emptyText="No organization matches."
                />
                {inSettings ? null : (
                  <span className="topbar__slash" aria-hidden="true">
                    /
                  </span>
                )}
                {inSettings ? null : shownLocation ? (
                  <ContextSwitcher
                    label="Location"
                    icon={<Icon name="location" aria-hidden="true" focusable="false" />}
                    current={shownLocation.name}
                    options={data.locations.map((location) => ({
                      value: location.id,
                      label: location.name,
                      icon: <Icon name="location" aria-hidden="true" focusable="false" />,
                    }))}
                    value={shownLocation.id}
                    onSelect={(id) => void chooseLocation(id)}
                    searchLabel="Switch location…"
                    emptyText="No location matches."
                    footer={(close) => (
                      <Link
                        to="/$org/settings/locations"
                        params={{ org: data.slug }}
                        className="switcher__action"
                        onClick={close}
                      >
                        <Icon name="general" aria-hidden="true" focusable="false" />
                        Manage locations
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
                <Icon name="search" aria-hidden="true" focusable="false" />
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
          <TabBar slug={data.slug} />
        </SidebarInset>
      </div>
      <KeyboardShortcuts open={shortcuts} onOpenChange={setShortcuts} />
      <CommandMenu
        slug={data.slug}
        open={searching}
        onOpenChange={setSearching}
        pages={pages}
        canSearchMembers={data.actor.permissions.includes("members:read")}
        actions={{
          sell: data.actor.permissions.includes("purchases:create")
            ? (member) => void navigate({ to: "/$org/sales/new", params: { org: data.slug }, search: { member: member.id } })
            : undefined,
        }}
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
  canSignOut,
  activeTo,
  onShortcuts,
}: {
  data: OrganizationData;
  onShortcuts: () => void;
  canSignOut: boolean;
  /** The section that owns this page, when it is not the section in the path. */
  activeTo?: RoutedPath;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { open, setOpenMobile } = useSidebar();
  const closeDrawer = () => setOpenMobile(false);
  const inSettings = isSettingsPath(pathname, data.slug);

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
          <Icon name="sidebar" className="sidebar__collapse-close" aria-hidden="true" focusable="false" />
          <Icon name="sidebar" className="sidebar__collapse-open" aria-hidden="true" focusable="false" />
        </SidebarTrigger>
        <button type="button" className="sidebar__close" onClick={closeDrawer}>
          <Icon name="close" aria-hidden="true" focusable="false" />
          <span className="visually-hidden">Close navigation</span>
        </button>
      </SidebarHeader>
      <SidebarContent aria-label={inSettings ? "Settings" : "Staff pages"}>
        {inSettings ? (
          <SettingsNav slug={data.slug} organization={data.name} onNavigate={closeDrawer} />
        ) : (
          <SidebarMenu>
          {readablePages(data.actor.permissions).map((item) => (
            <SidebarMenuItem key={item.label}>
              {/* The router marks the active link (aria-current="page"). A section stays active on its detail pages. */}
              <SidebarMenuButton
                tooltip={item.label}
                render={
                  <Link
                    to={item.to}
                    params={{ org: data.slug }}
                    activeOptions={{ exact: activeTo !== undefined }}
                    inactiveProps={activeTo === item.to ? { "aria-current": "page" } : undefined}
                    onClick={closeDrawer}
                  />
                }
              >
                <Icon name={item.icon} aria-hidden="true" focusable="false" />
                <span className="nav-item__label">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter>
        <AccountMenu
          actor={data.actor}
          slug={data.slug}
          canSignOut={canSignOut}
          onNavigate={closeDrawer}
          onShortcuts={() => {
            closeDrawer();
            onShortcuts();
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}

const THEME_CHOICES: ReadonlyArray<{ value: Theme; label: string; icon: IconName }> = [
  { value: "light", label: "Light", icon: "appearance" },
  { value: "dark", label: "Dark", icon: "appearance" },
  { value: "system", label: "System", icon: "appearance" },
];

/**
 * The account menu, at the foot of the sidebar. It holds the theme choice,
 * settings, and sign-out. Sign-out submits a hidden form, so it is
 * a same-origin POST, not a script call.
 */
function AccountMenu({
  actor,
  slug,
  canSignOut,
  onNavigate,
  onShortcuts,
}: {
  actor: OrganizationData["actor"];
  slug: string;
  canSignOut: boolean;
  onNavigate: () => void;
  /** Opens the keyboard shortcuts sheet. */
  onShortcuts: () => void;
}) {
  const modKey = useModKeyLabel();
  const signOutForm = useRef<HTMLFormElement>(null);
  const icon = { "aria-hidden": true, focusable: false } as const;
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

  function openSettings() {
    onNavigate();
    void navigate({ to: "/$org/settings", params: { org: slug } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="account__button">
        <span className="account__avatar" aria-hidden="true">
          {initials(actor.name)}
        </span>
        <span className="account__name">{actor.name}</span>
        <Icon name="chevrons" className="account__chevron" {...icon} />
        <span className="visually-hidden">, account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start">
        <DropdownMenuHeader>
          <span className="menu__email">{actor.email}</span>
        </DropdownMenuHeader>
        <DropdownMenuItem onClick={openSettings}>
          <Icon name="general" {...icon} />
          Settings
          <DropdownMenuShortcut>{modKey},</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShortcuts}>
          <Icon name="developer" {...icon} />
          Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon name={current.icon} {...icon} />
            Theme
            <DropdownMenuShortcut>
              {current.label}
              <Icon name="chevronRight" {...icon} />
            </DropdownMenuShortcut>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(value) => chooseTheme(value as Theme)}>
              {THEME_CHOICES.map((choice) => (
                <DropdownMenuRadioItem key={choice.value} value={choice.value}>
                  <Icon name={choice.icon} {...icon} />
                  {choice.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {canSignOut ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutForm.current?.requestSubmit()}>
              <Icon name="checkIns" className="icon--flip" {...icon} />
              Sign out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
      {canSignOut ? <SignOutForm ref={signOutForm} showButton={false} /> : null}
    </DropdownMenu>
  );
}
