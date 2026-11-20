import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { ArrowDown, ChevronRight, Clock, ListFilter, Plus, Search, X } from "lucide-react";
import { ListPager } from "../../components/ListPager";
import { PageActions } from "../../components/PageActions";
import { TableState } from "../../components/TableState";
import { Kbd, initials } from "../../components/ui";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { PAGE_SIZE } from "../../lib/paging";
import type { Failure, Result } from "../../lib/result";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  KIND_FILTERS,
  VISIBILITY_FILTERS,
  filterFromSearch,
  filterPrograms,
  lengthText,
  programCounts,
  programsRange,
  upcomingText,
  type ProgramsFilter,
  type ProgramsSearch,
} from "./facts";
import { KindTile } from "./kinds";

type Program = Schemas["ProgramListItem"];

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;

/**
 * Paper "Programs": Filter and search, a header band, then one 52px row per
 * program with its kind, length, host, and upcoming sessions. Rails returns
 * every program of the organization; the list filters and pages here.
 */
export function ProgramsList({ programs, search }: { programs: Result<Program[]>; search: ProgramsSearch }) {
  const filter = filterFromSearch(search);
  const q = search.q ?? "";
  return (
    <div className="page programs-list">
      <ListHead />
      {!programs.ok ? (
        <DidNotLoad error={programs.error} />
      ) : !programs.data.length ? (
        <NoPrograms />
      ) : (
        <>
          <Toolbar programs={programs.data} filter={filter} search={search} />
          <Results programs={programs.data} filter={filter} q={q} />
        </>
      )}
    </div>
  );
}

function ListHead() {
  const organization = useOrganization();
  const can = useCan();
  return (
    <header className="programs-head">
      <h1>Programs</h1>
      {can("programs:manage") ? (
        <PageActions>
          <Link to="/$org/programs/new" params={{ org: organization.slug }} className={buttonVariants({ size: "compact" })}>
            <Plus {...icon} />
            New program
          </Link>
        </PageActions>
      ) : null}
    </header>
  );
}

function useSetSearch(current: ProgramsSearch) {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: Partial<ProgramsSearch>) => {
    const merged = { ...current, ...next };
    const clean: ProgramsSearch = {};
    if (merged.kind) clean.kind = merged.kind;
    if (merged.visibility) clean.visibility = merged.visibility;
    if (merged.q) clean.q = merged.q;
    void navigate({ to: "/$org/programs", params: { org: organization.slug }, search: clean, replace: true });
  };
}

function Toolbar({ programs, filter, search }: { programs: Program[]; filter: ProgramsFilter; search: ProgramsSearch }) {
  const setSearch = useSetSearch(search);
  const counts = programCounts(programs);
  const toggle = (key: "kind" | "visibility", value: string, on: boolean) => {
    const values = new Set<string>(filter[key]);
    if (on) values.add(value);
    else values.delete(value);
    const allowed = (key === "kind" ? KIND_FILTERS : VISIBILITY_FILTERS).map((item) => item.value as string);
    setSearch({ [key]: allowed.filter((item) => values.has(item)).join(",") || undefined });
  };
  const groups = [
    { key: "kind" as const, title: "Kind", items: KIND_FILTERS, chosen: filter.kind as string[] },
    { key: "visibility" as const, title: "Visibility", items: VISIBILITY_FILTERS, chosen: filter.visibility as string[] },
  ];

  return (
    <div className="programs-toolbar">
      <div className="programs-toolbar__filters">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <ListFilter {...icon} />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="sales-filter-menu">
            {groups.map((group) => (
              <DropdownMenuSub key={group.key}>
                <DropdownMenuSubTrigger>
                  {group.title}
                  <DropdownMenuShortcut>
                    <ChevronRight {...icon} />
                  </DropdownMenuShortcut>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="sales-filter-menu">
                  {group.items.map((item) => (
                    <DropdownMenuCheckboxItem
                      key={item.value}
                      checked={group.chosen.includes(item.value)}
                      onCheckedChange={(on) => toggle(group.key, item.value, on)}
                    >
                      {item.label}
                      <DropdownMenuShortcut className="sales-filter-menu__count">{counts[item.value]}</DropdownMenuShortcut>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {groups.map((group) => {
          const values = group.items.filter((item) => group.chosen.includes(item.value)).map((item) => item.label);
          if (!values.length) return null;
          return (
            <span key={group.key} className="filter-chip">
              <span className="filter-chip__part filter-chip__name">{group.title}</span>
              <span className="filter-chip__part filter-chip__op">{values.length > 1 ? "is any of" : "is"}</span>
              <span className="filter-chip__part filter-chip__values">{values.join(", ")}</span>
              <button
                type="button"
                className="filter-chip__clear"
                aria-label={`Clear the ${group.title.toLowerCase()} filter`}
                onClick={() => setSearch({ [group.key]: undefined })}
              >
                <X {...icon} />
              </button>
            </span>
          );
        })}
      </div>
      <SearchField q={search.q ?? ""} onSearch={(q) => setSearch({ q: q || undefined })} />
    </div>
  );
}

/** Filters as staff type, after a short pause, and at once on Enter. "/" focuses it; Escape clears it. */
function SearchField({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(q);
  useShortcut("/", () => input.current?.focus());

  useEffect(() => {
    setValue((current) => (current.trim() === q ? current : q));
  }, [q]);

  const search = (next: string) => {
    if (next.trim() !== q) onSearch(next.trim());
  };

  useEffect(() => {
    const timer = window.setTimeout(() => search(value), 250);
    return () => window.clearTimeout(timer);
    // Only typing restarts the pause.
  }, [value]);

  return (
    <form
      role="search"
      className="list-search programs-toolbar__search"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        search(value);
      }}
    >
      <label htmlFor="program-search" className="visually-hidden">
        Search programs by name or host
      </label>
      <Search className="list-search__icon" {...icon} />
      <input
        ref={input}
        id="program-search"
        className="list-search__input"
        type="search"
        placeholder="Search programs or hosts"
        autoComplete="off"
        maxLength={200}
        aria-keyshortcuts="/"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            search("");
          }
        }}
      />
      <Kbd>/</Kbd>
    </form>
  );
}

function Results({ programs, filter, q }: { programs: Program[]; filter: ProgramsFilter; q: string }) {
  const organization = useOrganization();
  const navigate = useNavigate();
  const shown = filterPrograms(programs, filter, q);
  if (!shown.length) {
    const onlySearch = q && !filter.kind.length && !filter.visibility.length;
    return (
      <TableState
        title={q ? `No programs match “${q}”` : "No programs match these filters"}
        action={
          <Button
            type="button"
            variant="secondary"
            size="compact"
            onClick={() => void navigate({ to: "/$org/programs", params: { org: organization.slug }, search: {}, replace: true })}
          >
            {onlySearch ? "Clear search" : "Clear filters"}
          </Button>
        }
      />
    );
  }
  // A new filter starts again at page 1.
  return <ProgramRows key={`${filter.kind.join()}|${filter.visibility.join()}|${q}`} programs={shown} />;
}

function ProgramRows({ programs }: { programs: Program[] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const [requested, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(programs.length / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const first = (page - 1) * PAGE_SIZE;
  const rows = programs.slice(first, first + PAGE_SIZE);
  const manyLocations = organization.locations.length > 1;

  return (
    <section className="programs-table" aria-label="Programs">
      <ProgramsHead />
      <ul className="programs-rows">
        {rows.map((program) => (
          <li key={program.id}>
            <Link
              to="/$org/programs/$programId"
              params={{ org: organization.slug, programId: program.id }}
              className="programs-row programs-grid"
            >
              <span className="programs-row__program">
                <KindTile kind={program.kind} />
                <span className="programs-row__text">
                  <span className="programs-row__title">
                    <span className="programs-row__name">{program.name}</span>
                    {program.published ? null : <span className="programs-row__staff">Staff only</span>}
                  </span>
                  <span className="programs-row__line">
                    {PROGRAM_KIND_LABEL[program.kind]}
                    <span className="programs-row__dot" aria-hidden="true">
                      ·
                    </span>
                    <Clock className="programs-row__clock" {...icon} />
                    {lengthText(program.duration_minutes)}
                    {manyLocations ? (
                      <>
                        <span className="programs-row__dot" aria-hidden="true">
                          ·
                        </span>
                        {locationName(program.location_id)}
                      </>
                    ) : null}
                    {/* Phones put the host on this line. */}
                    <span className="programs-row__phone-host"> · {program.host_name ?? "No host"}</span>
                  </span>
                </span>
              </span>
              <span className="programs-row__host programs-col--host">
                {program.host_name ? (
                  <>
                    <span className="programs-row__avatar" aria-hidden="true">
                      {initials(program.host_name).slice(0, 1)}
                    </span>
                    <span className="programs-row__host-name">{program.host_name}</span>
                  </>
                ) : (
                  <span className="programs-row__no-host">No host</span>
                )}
              </span>
              <span className="programs-row__upcoming programs-col--num">{upcomingText(program.upcoming_count)}</span>
              <ChevronRight className="programs-row__chevron" {...icon} />
            </Link>
          </li>
        ))}
      </ul>
      <ListPager label="Program pages" range={programsRange(first, rows.length, programs.length)} page={page} pages={pages} onPage={setPage} />
    </section>
  );
}

/** Column titles for sighted staff. Each row link reads its own facts. */
function ProgramsHead() {
  return (
    <div className="programs-table__head programs-grid" aria-hidden="true">
      <span className="programs-table__sort">
        Program
        <ArrowDown {...icon} />
      </span>
      <span className="programs-col--host">Host</span>
      <span className="programs-col--num">Upcoming</span>
      <span />
    </div>
  );
}

function NoPrograms() {
  const organization = useOrganization();
  const can = useCan();
  const manage = can("programs:manage");
  return (
    <TableState
      className="programs-table"
      head={<ProgramsHead />}
      grid="programs-grid"
      cells={["avatar", "text", "num", "blank"]}
      title="No programs yet"
      text={manage ? "Classes and open-gym sessions you add show up here." : "A manager adds programs."}
      action={
        manage ? (
          <Link to="/$org/programs/new" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            <Plus {...icon} />
            New program
          </Link>
        ) : null
      }
    />
  );
}

function DidNotLoad({ error }: { error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="list-state" role="alert">
      <p className="list-state__title">Programs did not load.</p>
      <p className="list-state__text">{failureMessage(error)}</p>
      <Button
        type="button"
        variant="secondary"
        size="compact"
        disabled={retrying}
        aria-busy={retrying || undefined}
        onClick={async () => {
          setRetrying(true);
          await router.invalidate();
          setRetrying(false);
        }}
      >
        Try again
      </Button>
    </div>
  );
}

/** Paper "Programs — Loading": the toolbar and the header band stay; four skeleton rows. */
export function ProgramsLoading() {
  return (
    <div className="page programs-list" role="status" aria-busy="true" aria-label="Loading programs">
      <ListHead />
      <div className="programs-toolbar" aria-hidden="true">
        <span className="programs-toolbar__filters">
          <span className="skeleton-block programs-skeleton__button" />
        </span>
        <span className="list-search programs-toolbar__search skeleton-block" />
      </div>
      <div className="programs-table" aria-hidden="true">
        <div className="programs-table__head programs-grid">
          <span>Program</span>
          <span className="programs-col--host">Host</span>
          <span className="programs-col--num">Upcoming</span>
          <span />
        </div>
        <div className="programs-rows">
          {[38, 30, 34, 26].map((width, index) => (
            <div key={index} className="programs-row programs-skeleton__row">
              <span className="program-tile skeleton-block" data-size={28} />
              <span className="programs-skeleton__text">
                <span className="skeleton-line" style={{ width: `${width}%` }} />
                <span className="skeleton-line skeleton-line--small" style={{ width: `${width - 12}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
