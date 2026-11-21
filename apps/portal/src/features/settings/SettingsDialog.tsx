import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, getRouteApi, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import { getTeam } from "../../lib/staff.functions";
import { Appearance } from "./Appearance";
import { General } from "./General";
import { GymSite } from "./GymSite";
import { Locations } from "./Locations";
import { Roles } from "./Roles";
import { Staff } from "./Staff";
import {
  SETTINGS_GROUPS,
  matchSettingsPages,
  type SettingsSlug,
} from "./sections";

const orgRoute = getRouteApi("/$org");
const isSettingsIndex = (pathname: string) => /^\/[^/]+\/settings\/?$/.test(pathname);
const icon = { "aria-hidden": true, focusable: false } as const;

type Search = Record<string, unknown>;

/**
 * Opens and closes Settings over the current page. Opening adds a history
 * entry, so Back closes it. Moving between settings pages replaces it.
 */
export function useSettings() {
  const navigate = useNavigate();
  const router = useRouter();
  const open = useCallback(
    (settings: SettingsSlug, { replace = false }: { replace?: boolean } = {}) =>
      void navigate({
        to: ".",
        search: ((prev: Search) => ({ ...prev, settings })) as never,
        replace,
        resetScroll: false,
      }),
    [navigate],
  );
  const close = useCallback(
    () =>
      void navigate({
        to: ".",
        search: ((prev: Search) => {
          const { settings: _settings, ...rest } = prev;
          // On /<org>/settings, the page of a role that can read no other page, the closed page stays.
          return isSettingsIndex(router.state.location.pathname) ? { ...rest, closed: true } : rest;
        }) as never,
        resetScroll: false,
      }),
    [navigate, router],
  );
  return { open, close };
}

/**
 * Settings: a large dialog over the dimmed app. The left side has the title,
 * a search, and the pages in groups; the right side shows one page in a 720px
 * column. ui-sdk traps focus, closes on Escape, and returns focus.
 */
export function SettingsDialog() {
  const { settings } = orgRoute.useSearch();
  const { open, close } = useSettings();
  const organization = useOrganization();
  const team = useTeam(organization.slug, settings === "staff" || settings === "roles");
  const main = useRef<HTMLDivElement>(null);

  // A new page starts at its top.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [settings]);

  return (
    <Dialog open={settings !== undefined} onOpenChange={(next) => !next && close()}>
      {/* Focus starts on the dialog, so Tab reaches the search first and no field shows a ring on open. */}
      <DialogContent className="settings-dialog" aria-describedby={undefined} initialFocus="content">
        <aside className="settings-dialog__side">
          <DialogTitle className="settings-dialog__title">Settings</DialogTitle>
          {settings ? <SettingsNav current={settings} onOpen={(slug) => open(slug, { replace: true })} /> : null}
        </aside>
        <div className="settings-dialog__main" ref={main}>
          <div className="settings-dialog__column">
            {settings ? <SettingsContent slug={settings} team={team} /> : null}
          </div>
        </div>
        <button type="button" className="settings-dialog__close" onClick={close}>
          <Icon name="close" {...icon} />
          <span className="visually-hidden">Close settings</span>
        </button>
      </DialogContent>
    </Dialog>
  );
}

function SettingsContent({ slug, team }: { slug: SettingsSlug; team: TeamState }): ReactNode {
  switch (slug) {
    case "appearance":
      return <Appearance />;
    case "general":
      return <General />;
    case "gym-site":
      return <GymSite />;
    case "locations":
      return <Locations />;
    case "staff":
      return <Staff team={team.data} reload={team.reload} />;
    case "roles":
      return <Roles team={team.data} reload={team.reload} />;
  }
}

/** The search and the grouped pages. The search keeps the pages whose name or keywords match. */
function SettingsNav({ current, onOpen }: { current: SettingsSlug; onOpen: (slug: SettingsSlug) => void }) {
  const [query, setQuery] = useState("");
  const pages = matchSettingsPages(query);
  const nav = useRef<HTMLElement>(null);
  // Phones show the pages in one scrolling row; keep the open page in view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);
  return (
    <>
      <div className="settings-dialog__search">
        <Icon name="search" {...icon} />
        <input
          type="search"
          className="settings-dialog__search-input"
          placeholder="Search"
          aria-label="Search settings"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Enter opens the first page that matches.
            if (event.key === "Enter" && pages[0]) {
              event.preventDefault();
              onOpen(pages[0].slug);
            }
          }}
        />
      </div>
      <nav className="settings-dialog__nav" aria-label="Settings pages" ref={nav}>
        {pages.length === 0 ? <p className="settings-dialog__none">No settings match.</p> : null}
        {SETTINGS_GROUPS.map((group) => {
          const items = pages.filter((page) => page.group === group);
          if (items.length === 0) return null;
          return (
            <div className="settings-dialog__group" key={group}>
              <p className="settings-dialog__group-label" id={`settings-group-${group}`}>
                {group}
              </p>
              <ul aria-labelledby={`settings-group-${group}`}>
                {items.map((page) => (
                  <li key={page.slug}>
                    <Link
                      to="."
                      search={((prev: Search) => ({ ...prev, settings: page.slug })) as never}
                      replace
                      resetScroll={false}
                      className="settings-dialog__item"
                      aria-current={page.slug === current ? "page" : undefined}
                    >
                      <Icon name={page.icon} {...icon} />
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </>
  );
}

type TeamState = { data: Result<Schemas["Team"]> | null; reload: () => Promise<void> };

/**
 * The staff list with its roles, from WorkOS through Rails. Staff and Roles
 * share it. It loads when one of them opens and after every change.
 */
function useTeam(slug: string, needed: boolean): TeamState {
  const [data, setData] = useState<Result<Schemas["Team"]> | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await getTeam({ data: { slug } }));
    } catch {
      setData({ ok: false, error: { status: 0, code: "invalid_input", message: "" } });
    }
  }, [slug]);
  useEffect(() => {
    if (needed) void reload();
  }, [needed, reload]);
  return { data, reload };
}

