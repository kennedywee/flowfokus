import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plug,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  SETTINGS_SECTIONS,
  settingsSectionFor,
  type SettingsSection,
} from "./sections";

const ICON: Record<string, LucideIcon> = {
  general: SlidersHorizontal,
  locations: MapPin,
  staff: Users,
  notifications: Bell,
  integrations: Plug,
};

const icon = {
  strokeWidth: 1.5,
  "aria-hidden": true,
  focusable: false,
} as const;

/** The section shown for a settings address. The index shows General on wide screens. */
function useCurrentSection(slug: string): SettingsSection {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  return settingsSectionFor(pathname, slug) ?? SETTINGS_SECTIONS[0]!;
}

/**
 * Paper's settings sidebar: Back to app, the organization's sections, then
 * the sample sections under their own heading. It replaces the page list
 * while a settings page is open. Section icons show only on the icon rail.
 */
export function SettingsNav({
  slug,
  organization,
  onNavigate,
}: {
  slug: string;
  organization: string;
  onNavigate: () => void;
}) {
  const current = useCurrentSection(slug);
  const real = SETTINGS_SECTIONS.filter((section) => !section.sample);
  const samples = SETTINGS_SECTIONS.filter((section) => section.sample);
  const item = (section: SettingsSection) => {
    const Icon = ICON[section.slug]!;
    const active = section.slug === current.slug;
    return (
      <SidebarMenuItem key={section.slug}>
        <SidebarMenuButton
          tooltip={section.label}
          // The router marks the open section. The index (General) and Roles (Staff) are marked here.
          render={
            <Link
              to={section.to}
              params={{ org: slug }}
              inactiveProps={active ? { "aria-current": "page" } : undefined}
              onClick={onNavigate}
            />
          }
        >
          <Icon className="settings-nav__icon" {...icon} />
          <span className="nav-item__label">{section.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };
  return (
    <div className="settings-nav">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Back to app"
            className="settings-nav__back"
            render={
              <Link
                to="/$org"
                params={{ org: slug }}
                activeOptions={{ exact: true }}
                onClick={onNavigate}
              />
            }
          >
            <ArrowLeft {...icon} />
            <span className="nav-item__label">Back to app</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <NavGroup label={organization}>{real.map(item)}</NavGroup>
      <NavGroup label="Samples">{samples.map(item)}</NavGroup>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-nav__group" role="group" aria-label={label}>
      <p className="settings-nav__label" aria-hidden="true">
        {label}
      </p>
      <SidebarMenu>{children}</SidebarMenu>
    </div>
  );
}

/**
 * The settings index on phones: a plain list of the sections, built like
 * Paper's "Phone — More". Wide screens show General here instead.
 */
export function SettingsIndexList({ slug }: { slug: string }) {
  const real = SETTINGS_SECTIONS.filter((section) => !section.sample);
  const samples = SETTINGS_SECTIONS.filter((section) => section.sample);
  const row = (section: SettingsSection) => {
    const Icon = ICON[section.slug]!;
    return (
      <li key={section.slug}>
        <Link
          to={section.to}
          params={{ org: slug }}
          className="settings-index__row"
        >
          <Icon {...icon} />
          <span className="settings-index__label">{section.label}</span>
          <ChevronRight className="settings-index__chevron" {...icon} />
        </Link>
      </li>
    );
  };
  return (
    <div className="settings-index">
      <h1>Settings</h1>
      <ul className="settings-index__list">{real.map(row)}</ul>
      <p className="settings-index__band">Samples</p>
      <ul className="settings-index__list">{samples.map(row)}</ul>
    </div>
  );
}

/** "‹ Settings" above a section on phones. It opens the settings list. */
export function SettingsBack({ slug }: { slug: string }) {
  return (
    <Link to="/$org/settings" params={{ org: slug }} className="settings-back">
      <ChevronLeft {...icon} />
      Settings
    </Link>
  );
}
