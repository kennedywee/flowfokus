import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, ListFilter, X } from "lucide-react";
import { PageActions } from "../../components/PageActions";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useDeskLocation, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { clockTime } from "../check-ins/facts";
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
  DAYS,
  atLocation,
  clockRange,
  dayKey,
  dayTitle,
  filterPrograms,
  groupByDay,
  programCounts,
  programLine,
  rangeLabel,
  readPrograms,
  rowStatusText,
  sessionCount,
  sessionState,
  shiftDay,
  type ProgramCount,
  type ScheduleSearch,
} from "./facts";
import { OccurrenceMark } from "./marks";

type Entry = Schemas["ScheduleEntry"];

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/**
 * Schedule: two weeks of sessions at the top bar location, one band per day.
 * Each row opens the session. Filter narrows the list to some programs.
 */
export function Schedule({ schedule, search }: { schedule: Result<Entry[]>; search: ScheduleSearch }) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  const today = dayKey(new Date().toISOString(), organization.timezone);
  const from = search.from ?? today;
  const here = schedule.ok ? atLocation(schedule.data, desk?.id ?? null) : [];
  const programs = readPrograms(search.program);
  const shown = filterPrograms(here, programs);

  return (
    <div className="page schedule">
      <ScheduleHead />
      {!schedule.ok ? (
        <>
          <Toolbar from={from} today={today} />
          <DidNotLoad error={schedule.error} />
        </>
      ) : !here.length ? (
        <>
          <Toolbar from={from} today={today} />
          <div className="list-state" role="status">
            <p className="list-state__title">No sessions in these two weeks.</p>
            <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
              Add sessions from a program
            </Link>
          </div>
        </>
      ) : (
        <>
          <Toolbar from={from} today={today} search={search} counts={programCounts(here)} programs={programs} />
          {shown.length ? (
            groupByDay(shown, organization.timezone).map(([day, entries]) => (
              <DayGroup key={day} day={day} today={today} entries={entries} />
            ))
          ) : (
            <NoMatch search={search} />
          )}
        </>
      )}
    </div>
  );
}

function ScheduleHead() {
  const organization = useOrganization();
  return (
    <header className="schedule-head">
      <h1>Schedule</h1>
      <PageActions>
        <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
          <CalendarCheck {...icon} />
          Programs
        </Link>
      </PageActions>
    </header>
  );
}

/** Replaces the URL search, so Back and reload keep the range and the filter. */
function useSetSearch() {
  const organization = useOrganization();
  const navigate = useNavigate();
  return (next: ScheduleSearch) => void navigate({ to: "/$org/schedule", params: { org: organization.slug }, search: next, replace: true });
}

function Toolbar({
  from,
  today,
  search,
  counts,
  programs = [],
}: {
  from: string;
  today: string;
  search?: ScheduleSearch;
  counts?: ProgramCount[];
  programs?: string[];
}) {
  const organization = useOrganization();
  const keep = search?.program ? { program: search.program } : {};
  const at = (day: string) => (day === today ? keep : { ...keep, from: day });
  return (
    <div className="schedule-toolbar">
      {search && counts ? <ProgramFilter search={search} counts={counts} programs={programs} /> : null}
      <nav className="schedule-range" aria-label="Weeks">
        <span className="schedule-range__label">{rangeLabel(from)}</span>
        <span className="schedule-range__buttons">
          <Link to="/$org/schedule" params={{ org: organization.slug }} search={at(shiftDay(from, -DAYS))} className="schedule-range__button">
            <ChevronLeft {...icon} />
            <span className="schedule-range__text">Earlier</span>
          </Link>
          {from === today ? null : (
            <Link to="/$org/schedule" params={{ org: organization.slug }} search={keep} className="schedule-range__button">
              Today
            </Link>
          )}
          <Link to="/$org/schedule" params={{ org: organization.slug }} search={at(shiftDay(from, DAYS))} className="schedule-range__button">
            <span className="schedule-range__text">Later</span>
            <ChevronRight {...icon} />
          </Link>
        </span>
      </nav>
    </div>
  );
}

/** Filter, as on Check-ins: a Program submenu with a count per program, then a chip. */
function ProgramFilter({ search, counts, programs }: { search: ScheduleSearch; counts: ProgramCount[]; programs: string[] }) {
  const setSearch = useSetSearch();
  const set = (ids: string[]) => {
    const next: ScheduleSearch = search.from ? { from: search.from } : {};
    if (ids.length) next.program = ids.join(",");
    setSearch(next);
  };
  const toggle = (id: string, on: boolean) => set(on ? [...programs, id] : programs.filter((item) => item !== id));
  const chosen = counts.filter((item) => programs.includes(item.id)).map((item) => item.name);

  return (
    <div className="schedule-toolbar__filters">
      <DropdownMenu>
        <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
          <ListFilter {...icon} />
          Filter
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="sales-filter-menu">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              Program
              <DropdownMenuShortcut>
                <ChevronRight {...icon} />
              </DropdownMenuShortcut>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="sales-filter-menu">
              {counts.map((item) => (
                <DropdownMenuCheckboxItem key={item.id} checked={programs.includes(item.id)} onCheckedChange={(on) => toggle(item.id, on)}>
                  {item.name}
                  <DropdownMenuShortcut className="sales-filter-menu__count">{item.count}</DropdownMenuShortcut>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      {chosen.length ? (
        <span className="filter-chip">
          <span className="filter-chip__part filter-chip__name">Program</span>
          <span className="filter-chip__part filter-chip__op">{chosen.length > 1 ? "is any of" : "is"}</span>
          <span className="filter-chip__part filter-chip__values">{chosen.join(", ")}</span>
          <button type="button" className="filter-chip__clear" aria-label="Clear the program filter" onClick={() => set([])}>
            <X {...icon} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

function DayGroup({ day, today, entries }: { day: string; today: string; entries: Entry[] }) {
  const title = dayTitle(day, today);
  return (
    <section className="schedule-day" aria-label={title}>
      <h2 className="schedule-band">
        <CalendarDays className="schedule-band__icon" strokeWidth={1.5} aria-hidden="true" focusable="false" />
        <span className="schedule-band__title">{title}</span>
        <span className="schedule-band__count">{sessionCount(entries.length)}</span>
      </h2>
      <ul className="schedule-rows">
        {entries.map((entry) => (
          <li key={entry.id}>
            <SessionRow entry={entry} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionRow({ entry }: { entry: Entry }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const state = sessionState(entry);
  const line = programLine(entry, PROGRAM_KIND_LABEL[entry.program.kind]);
  return (
    <Link
      to="/$org/schedule/$occurrenceId"
      params={{ org: organization.slug, occurrenceId: entry.id }}
      className="schedule-row"
      data-past={state === "ended" || state === "cancelled" || undefined}
    >
      <time className="schedule-row__time" dateTime={entry.starts_at} suppressHydrationWarning>
        <span className="schedule-row__range">{clockRange(entry.starts_at, entry.ends_at, tz)}</span>
        <span className="schedule-row__start">{clockTime(entry.starts_at, tz)}</span>
      </time>
      <span className="schedule-row__text">
        <span className="schedule-row__name">{entry.program.name}</span>
        <span className="schedule-row__line">
          <span className="schedule-row__until">Until {clockTime(entry.ends_at, tz)} · </span>
          {line}
        </span>
      </span>
      <span className="schedule-row__status" data-state={state}>
        <OccurrenceMark occurrence={entry} />
        <span className="schedule-row__status-text" suppressHydrationWarning>
          {rowStatusText(entry)}
        </span>
      </span>
      <ChevronRight className="schedule-row__chevron" {...icon} />
    </Link>
  );
}

function NoMatch({ search }: { search: ScheduleSearch }) {
  const setSearch = useSetSearch();
  return (
    <div className="list-state" role="status">
      <p className="list-state__title">No sessions match.</p>
      <Button type="button" variant="secondary" size="compact" onClick={() => setSearch(search.from ? { from: search.from } : {})}>
        Clear filters
      </Button>
    </div>
  );
}

/** Paper "Did not load": one line, the reason in staff words, and Try again. */
function DidNotLoad({ error }: { error: Failure }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="list-state" role="alert">
      <p className="list-state__title">The schedule did not load.</p>
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

/** Paper "Loading": the title, then a grey band and bars where the rows go. */
export function ScheduleLoading() {
  return (
    <div className="page schedule" role="status" aria-busy="true" aria-label="Loading the schedule">
      <header className="schedule-head">
        <h1>Schedule</h1>
      </header>
      <div className="schedule-toolbar" aria-hidden="true">
        <span className="skeleton-line" style={{ width: 72, height: 28 }} />
      </div>
      <section className="schedule-day" aria-hidden="true">
        <div className="schedule-band">
          <span className="skeleton-line" style={{ width: 180 }} />
        </div>
        <div className="schedule-rows">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="schedule-row schedule-row--skeleton">
              <span className="skeleton-line" style={{ width: 84 }} />
              <span className="schedule-row__text">
                <span className="skeleton-line" style={{ width: 140 }} />
                <span className="skeleton-line" style={{ width: 110 }} />
              </span>
              <span className="skeleton-line" style={{ width: 96 }} />
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
