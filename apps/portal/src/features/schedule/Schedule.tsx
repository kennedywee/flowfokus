import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { FilterChips, FilterMenu, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useDeskLocation, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { clockTime } from "../check-ins/facts";
import { Button, buttonVariants } from "@/components/ui/button";
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

const icon = { "aria-hidden": true, focusable: false } as const;

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
          <Icon name="programs" {...icon} />
          Programs
        </Link>
      </PageActions>
    </header>
  );
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
            <Icon name="chevronLeft" {...icon} />
            <span className="schedule-range__text">Earlier</span>
          </Link>
          {from === today ? null : (
            <Link to="/$org/schedule" params={{ org: organization.slug }} search={keep} className="schedule-range__button">
              Today
            </Link>
          )}
          <Link to="/$org/schedule" params={{ org: organization.slug }} search={at(shiftDay(from, DAYS))} className="schedule-range__button">
            <span className="schedule-range__text">Later</span>
            <Icon name="chevronRight" {...icon} />
          </Link>
        </span>
      </nav>
    </div>
  );
}

/** Filter, as on Check-ins: a Program submenu with a count per program, then a chip. */
function ProgramFilter({ search, counts, programs }: { search: ScheduleSearch; counts: ProgramCount[]; programs: string[] }) {
  const setSearch = useSetListSearch("/$org/schedule", search, ["from", "program"]);
  const groups = [
    {
      key: "program" as const,
      title: "Program",
      options: counts.map((item) => ({ value: item.id, label: item.name, count: item.count })),
      chosen: programs,
    },
  ];
  return (
    <div className="schedule-toolbar__filters">
      <FilterMenu groups={groups} onChange={(key, values) => setSearch({ [key]: values.join(",") || undefined })} />
      <FilterChips groups={groups} onClear={(key) => setSearch({ [key]: undefined })} />
    </div>
  );
}

function DayGroup({ day, today, entries }: { day: string; today: string; entries: Entry[] }) {
  const title = dayTitle(day, today);
  return (
    <section className="schedule-day" aria-label={title}>
      <h2 className="schedule-band">
        <Icon name="schedule" className="schedule-band__icon" aria-hidden="true" focusable="false" />
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
      <Icon name="chevronRight" className="schedule-row__chevron" {...icon} />
    </Link>
  );
}

function NoMatch({ search }: { search: ScheduleSearch }) {
  const setSearch = useSetListSearch("/$org/schedule", search, ["from", "program"]);
  return (
    <div className="list-state" role="status">
      <p className="list-state__title">No sessions match.</p>
      <Button type="button" variant="secondary" size="compact" onClick={() => setSearch({ program: undefined })}>
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
