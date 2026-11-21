import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FilterChips, FilterMenu, nextListSearch, useSetListSearch } from "../../components/ListToolbar";
import { PageActions } from "../../components/PageActions";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useDeskLocation, useOrganization } from "../../lib/organization";
import type { Failure, Result } from "../../lib/result";
import { useNow } from "../../lib/use-now";
import { atLocation, clockRange, clockTime, programCounts, readPrograms, sessionCount, sessionState } from "../schedule/facts";
import { CalendarBlock, type Density } from "./Block";
import {
  KINDS,
  applyFilters,
  axisFor,
  blockLabel,
  blockStatus,
  dayHead,
  firstItem,
  groupEntries,
  groupOf,
  groupParam,
  hiddenParam,
  hourLabel,
  longDate,
  moveFocus,
  nowGeometry,
  nowMinutes,
  onDay,
  placeColumn,
  rangeText,
  readHidden,
  stepDate,
  viewOf,
  weekDays,
  weekStart,
  type CalendarGroup,
  type CalendarGroupData,
  type CalendarSearch,
  type NavItem,
  type Placed,
} from "./facts";

type Entry = Schemas["ScheduleEntry"];

const icon = { "aria-hidden": true, focusable: false } as const;
const KEYS = ["date", "view", "group", "program", "hide"] as const;
/** The height of one hour on the Day grid, in px. The stylesheet reads the same number. */
const HOUR = 64;
const GROUP_LABEL: Record<CalendarGroup, string> = { none: "None", program: "Program", host: "Host" };

/**
 * Calendar: the sessions at the top bar location, as a Day grid with a column
 * per group or a Week grid with a row per group. Kinds, program, grouping, view
 * and date live in the URL. A block opens the session. Phones get a list.
 */
export function Calendar({
  schedule,
  today,
  loadedAt,
  search,
}: {
  schedule: Result<Entry[]>;
  today: string;
  loadedAt: number;
  search: CalendarSearch;
}) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  const now = new Date(useNow(loadedAt, 60_000));
  const view = viewOf(search);
  const group = groupOf(search);
  const date = search.date ?? today;
  const programs = readPrograms(search.program);
  const hidden = readHidden(search.hide);
  const here = schedule.ok ? atLocation(schedule.data, desk?.id ?? null) : [];
  const { counts, shown } = applyFilters(here, programs, hidden);
  const from = view === "week" ? weekStart(date) : date;

  return (
    <div className="page calendar">
      <CalendarHead />
      <Toolbar
        search={search}
        today={today}
        date={date}
        count={schedule.ok ? shown.length : null}
        programs={schedule.ok ? programCounts(here) : []}
        chosen={programs}
      />
      <KindsRow search={search} counts={counts} hidden={hidden} />
      {!schedule.ok ? (
        <DidNotLoad error={schedule.error} />
      ) : !here.length ? (
        <div className="list-state" role="status">
          <p className="list-state__title">{view === "week" ? "No sessions this week." : "No sessions on this day."}</p>
          <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Add sessions from a program
          </Link>
        </div>
      ) : !shown.length ? (
        <NoMatch search={search} />
      ) : (
        <>
          <CalendarList entries={shown} view={view} from={from} today={today} now={now} />
          {view === "week" ? (
            <WeekGrid entries={shown} from={from} today={today} group={group} now={now} />
          ) : (
            <DayGrid key={date} entries={shown} day={date} today={today} group={group} now={now} />
          )}
        </>
      )}
    </div>
  );
}

function CalendarHead() {
  const organization = useOrganization();
  return (
    <header className="calendar-head">
      <h1>Calendar</h1>
      <PageActions>
        <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
          <Icon name="programs" {...icon} />
          Programs
        </Link>
      </PageActions>
    </header>
  );
}

/* ---------- Toolbar ---------- */

function Toolbar({
  search,
  today,
  date,
  count,
  programs,
  chosen,
}: {
  search: CalendarSearch;
  today: string;
  date: string;
  count: number | null;
  programs: ReturnType<typeof programCounts>;
  chosen: string[];
}) {
  const organization = useOrganization();
  const view = viewOf(search);
  const group = groupOf(search);
  const setSearch = useSetListSearch("/$org/calendar", search, KEYS);
  const at = (day: string) => nextListSearch(search, { date: day === today ? undefined : day }, KEYS);
  const unit = view === "week" ? "week" : "day";
  const filters = [
    {
      key: "program" as const,
      title: "Program",
      options: programs.map((item) => ({ value: item.id, label: item.name, count: item.count })),
      chosen,
    },
  ];
  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar__date">
        <span className="calendar-step">
          <Link
            to="/$org/calendar"
            params={{ org: organization.slug }}
            search={at(stepDate(view, date, -1))}
            className={buttonVariants({ variant: "secondary", size: "icon-compact" })}
            aria-label={`Previous ${unit}`}
          >
            <Icon name="chevronLeft" {...icon} />
          </Link>
          <Link
            to="/$org/calendar"
            params={{ org: organization.slug }}
            search={at(stepDate(view, date, 1))}
            className={buttonVariants({ variant: "secondary", size: "icon-compact" })}
            aria-label={`Next ${unit}`}
          >
            <Icon name="chevronRight" {...icon} />
          </Link>
        </span>
        <Link to="/$org/calendar" params={{ org: organization.slug }} search={at(today)} className={buttonVariants({ variant: "secondary", size: "compact" })}>
          Today
        </Link>
        <h2 className="calendar-date" aria-live="polite">
          <span className="calendar-date__text">{rangeText(view, date)}</span>
          {count === null ? null : <span className="calendar-date__count"> · {sessionCount(count)}</span>}
        </h2>
      </div>
      <div className="calendar-toolbar__controls">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Group by
            <span className="calendar-group-value">{GROUP_LABEL[group]}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={group} onValueChange={(value) => setSearch({ group: groupParam(value as CalendarGroup) })}>
              {(["none", "program", "host"] as const).map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {GROUP_LABEL[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {programs.length ? (
          <>
            <FilterMenu groups={filters} onChange={(key, values) => setSearch({ [key]: values.join(",") || undefined })} />
            <FilterChips groups={filters} onClear={(key) => setSearch({ [key]: undefined })} />
          </>
        ) : null}
        <SegmentedControl aria-label="View" value={view} onValueChange={(next) => setSearch({ view: next === "week" ? "week" : undefined })}>
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
        </SegmentedControl>
      </div>
    </div>
  );
}

/** Classes, Appointments, Events: each a toggle with its count. A switched-off kind goes in the URL as `hide`. */
function KindsRow({ search, counts, hidden }: { search: CalendarSearch; counts: Record<Schemas["ProgramKind"], number>; hidden: Schemas["ProgramKind"][] }) {
  const setSearch = useSetListSearch("/$org/calendar", search, KEYS);
  const on = KINDS.filter((item) => !hidden.includes(item.kind)).map((item) => item.slug);
  return (
    <ToggleGroup
      multiple
      aria-label="Kinds of session"
      className="calendar-kinds"
      value={on}
      onValueChange={(values: string[]) => setSearch({ hide: hiddenParam(KINDS.filter((item) => !values.includes(item.slug)).map((item) => item.kind)) })}
    >
      {KINDS.map((item) => (
        <ToggleGroupItem key={item.slug} value={item.slug} className="calendar-kind" data-kind={item.kind}>
          <Icon name={item.icon} {...icon} />
          {item.label}
          <span className="calendar-kind__count">{counts[item.kind]}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/* ---------- Blocks ---------- */

/** How much a block can say, from the minutes it is drawn tall. */
function densityOf(minutes: number): Density {
  if (minutes >= 55) return "full";
  if (minutes >= 40) return "compact";
  return "tight";
}

/** One session of the Rails schedule as a block. Under a program grouping the host is the title, because the column says the program. */
function SessionBlock({
  entry,
  variant,
  density = "full",
  group,
  now,
  navId,
  active,
  onActive,
}: {
  entry: Entry;
  variant: "day" | "week";
  density?: Density;
  group: CalendarGroup;
  now: Date;
  navId: string;
  active: boolean;
  onActive: (id: string) => void;
}) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const { kind } = entry.program;
  const state = sessionState(entry, now);
  // A cancelled session has no spots to count: its words say why.
  const showSpots = kind === "group_class" && variant === "day" && density === "full" && state !== "cancelled";
  return (
    <CalendarBlock
      kind={kind}
      state={state}
      density={density}
      variant={variant}
      time={variant === "week" || density !== "full" ? clockTime(entry.starts_at, tz) : clockRange(entry.starts_at, entry.ends_at, tz)}
      name={group === "program" ? entry.program.host_name?.trim() || "No host" : entry.program.name}
      status={blockStatus(entry, now)}
      spots={showSpots ? { capacity: entry.capacity, booked: entry.spots_taken } : undefined}
      label={blockLabel(entry, tz, PROGRAM_KIND_LABEL[kind], now)}
      href={{ org: organization.slug, occurrenceId: entry.id }}
      navId={navId}
      active={active}
      onActive={onActive}
    />
  );
}

/* ---------- Keyboard: one tab stop, arrow keys between blocks ---------- */

/**
 * One tab stop for the whole grid, on the active block. Up and Down walk a
 * column in time order, Left and Right move between columns, Home and End jump
 * to the ends of a column. Enter opens the session, because a block is a link.
 */
function useGridKeys(items: NavItem[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const current = active && items.some((item) => item.id === active) ? active : firstItem(items);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const id = (event.target as HTMLElement).closest<HTMLElement>("[data-nav-id]")?.dataset.navId;
    if (!id) return;
    const next = moveFocus(items, id, event.key);
    if (!next) return;
    event.preventDefault();
    setActive(next);
    ref.current?.querySelector<HTMLElement>(`[data-nav-id="${CSS.escape(next)}"]`)?.focus();
  };
  return { ref, current, setActive, onKeyDown };
}

function GridHint({ id }: { id: string }) {
  return (
    <p id={id} className="visually-hidden">
      Use the arrow keys to move between sessions, and Enter to open one.
    </p>
  );
}

/* ---------- Day ---------- */

function DayGrid({ entries, day, today, group, now }: { entries: Entry[]; day: string; today: string; group: CalendarGroup; now: Date }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const id = useId();
  const columns = groupEntries(onDay(entries, day, tz), group);
  const placed = columns.map((column) => placeColumn(column.entries, tz));
  const { start, end } = axisFor(placed.flat());
  const hours = Array.from({ length: end - start }, (_, index) => start + index);
  const nowAt = nowMinutes(day, now, tz);
  const nowAxis = nowGeometry(nowAt, { start, end }, HOUR);
  const items: NavItem[] = placed.flatMap((column, x) => column.map((item) => ({ id: item.entry.id, x, y: 0, start: Date.parse(item.entry.starts_at) })));
  const keys = useGridKeys(items);

  return (
    <section
      className="cal-day"
      aria-label={`${day === today ? "Today, " : ""}${longDate(day)}, by ${GROUP_LABEL[group].toLowerCase()}`}
      aria-describedby={`${id}-hint`}
      style={{ "--cols": columns.length, "--hours": hours.length, "--hour": `${HOUR}px` } as CSSProperties}
      ref={keys.ref}
      onKeyDown={keys.onKeyDown}
    >
      <GridHint id={`${id}-hint`} />
      <div className="cal-day__head">
        <span />
        {columns.map((column, index) => (
          <h3 key={column.key} id={`${id}-col-${index}`} className="cal-colhead" data-muted={column.key === "no-host" || undefined}>
            <span className="cal-colhead__label">{column.label}</span>
            <span className="cal-colhead__count">{column.entries.length}</span>
          </h3>
        ))}
      </div>
      <div className="cal-day__body">
        <div className="cal-axis" aria-hidden="true">
          {[...hours, end].map((hour) => (
            <span key={hour} className="cal-axis__hour" style={{ top: (hour - start) * HOUR }}>
              {hourLabel(hour)}
            </span>
          ))}
        </div>
        {nowAxis.wash > 0 ? <div className="cal-wash" aria-hidden="true" style={{ height: nowAxis.wash }} /> : null}
        {placed.map((column, index) => (
          <ul key={columns[index]?.key ?? index} className="cal-col" aria-labelledby={`${id}-col-${index}`}>
            {column.map((item) => (
              <li key={item.entry.id} className="cal-slot" style={slotStyle(item, start)}>
                <SessionBlock
                  entry={item.entry}
                  variant="day"
                  density={densityOf(item.end - item.start)}
                  group={group}
                  now={now}
                  navId={item.entry.id}
                  active={keys.current === item.entry.id}
                  onActive={keys.setActive}
                />
              </li>
            ))}
          </ul>
        ))}
        {nowAxis.line !== null ? (
          <div className="cal-now" aria-hidden="true" style={{ top: nowAxis.line }}>
            <span className="cal-now__tag" suppressHydrationWarning>
              {clockTime(now.toISOString(), tz)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function slotStyle(item: Placed, axisStart: number): CSSProperties {
  return {
    top: ((item.start - axisStart * 60) / 60) * HOUR,
    height: ((item.end - item.start) / 60) * HOUR,
    left: `${(item.lane / item.lanes) * 100}%`,
    width: `${100 / item.lanes}%`,
  };
}

/* ---------- Week ---------- */

function WeekGrid({ entries, from, today, group, now }: { entries: Entry[]; from: string; today: string; group: CalendarGroup; now: Date }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const id = useId();
  const days = weekDays(from);
  const rows = groupEntries(entries, group);
  const labelled = group !== "none";
  const items: NavItem[] = rows.flatMap((row, y) =>
    days.flatMap((day, x) => onDay(row.entries, day, tz).map((entry) => ({ id: entry.id, x, y, start: Date.parse(entry.starts_at) }))),
  );
  const keys = useGridKeys(items);
  return (
    <section
      className="cal-week"
      aria-label={`Week of ${rangeText("week", from)}, by ${GROUP_LABEL[group].toLowerCase()}`}
      aria-describedby={`${id}-hint`}
      data-labelled={labelled || undefined}
      ref={keys.ref}
      onKeyDown={keys.onKeyDown}
    >
      <GridHint id={`${id}-hint`} />
      <div className="cal-week__head">
        {labelled ? <span /> : null}
        {days.map((day) => {
          const head = dayHead(day);
          return (
            <h3 key={day} className="cal-dayhead" data-today={day === today || undefined} data-past={day < today || undefined}>
              <span>{head.weekday}</span>
              <span className="cal-dayhead__date">{head.date}</span>
            </h3>
          );
        })}
      </div>
      {rows.map((row) => (
        <div key={row.key} className="cal-week__row" role="group" aria-label={labelled ? row.label : "All sessions"}>
          {labelled ? <RowHead row={row} /> : null}
          {days.map((day, x) => {
            const cell = onDay(row.entries, day, tz);
            return (
              <ul
                key={day}
                className="cal-cell"
                aria-label={`${labelled ? `${row.label}, ` : ""}${dayHead(day).weekday} ${dayHead(day).date}`}
                data-today={day === today || undefined}
                data-past={day < today || undefined}
              >
                {cell.map((entry) => (
                  <li key={entry.id}>
                    <SessionBlock entry={entry} variant="week" group={group} now={now} navId={entry.id} active={keys.current === entry.id} onActive={keys.setActive} />
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
      ))}
    </section>
  );
}

function RowHead({ row }: { row: CalendarGroupData }) {
  return (
    <h3 className="cal-rowhead" data-muted={row.key === "no-host" || undefined}>
      <span className="cal-rowhead__label">{row.label}</span>
      <span className="cal-rowhead__count">{row.entries.length}</span>
    </h3>
  );
}

/* ---------- List: phones, and anyone who reads better in order ---------- */

function CalendarList({ entries, view, from, today, now }: { entries: Entry[]; view: "day" | "week"; from: string; today: string; now: Date }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const days = view === "week" ? weekDays(from) : [from];
  return (
    <div className="cal-list">
      {days.map((day) => {
        const sessions = onDay(entries, day, tz);
        if (!sessions.length) return null;
        return (
          <section key={day} className="cal-list__day" aria-label={longDate(day)}>
            <h3 className="cal-list__title">
              {day === today ? "Today, " : ""}
              {longDate(day).replace(/ \d{4}$/, "")}
              <span className="cal-list__count">{sessionCount(sessions.length)}</span>
            </h3>
            <ul>
              {sessions.map((entry) => (
                <li key={entry.id}>
                  <ListRow entry={entry} now={now} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ListRow({ entry, now }: { entry: Entry; now: Date }) {
  const organization = useOrganization();
  const tz = organization.timezone;
  const state = sessionState(entry, now);
  const kindLabel = PROGRAM_KIND_LABEL[entry.program.kind];
  return (
    <Link
      to="/$org/calendar/$occurrenceId"
      params={{ org: organization.slug, occurrenceId: entry.id }}
      className="cal-list__row"
      data-kind={entry.program.kind}
      data-state={state}
    >
      <span className="cal-list__time" suppressHydrationWarning>
        {clockRange(entry.starts_at, entry.ends_at, tz)}
      </span>
      <span className="cal-list__text">
        <span className="cal-list__name">{entry.program.name}</span>
        <span className="cal-list__line">
          {kindLabel} · {entry.program.host_name?.trim() || "No host"}
        </span>
      </span>
      <span className="cal-list__status" suppressHydrationWarning>
        {blockStatus(entry, now)}
      </span>
    </Link>
  );
}

/* ---------- States ---------- */

function NoMatch({ search }: { search: CalendarSearch }) {
  const setSearch = useSetListSearch("/$org/calendar", search, KEYS);
  return (
    <div className="list-state" role="status">
      <p className="list-state__title">No sessions match.</p>
      <Button type="button" variant="secondary" size="compact" onClick={() => setSearch({ program: undefined, hide: undefined })}>
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
      <p className="list-state__title">The calendar did not load.</p>
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

/** The title, the toolbar, and a grey block where the grid goes. */
export function CalendarLoading() {
  return (
    <div className="page calendar" role="status" aria-busy="true" aria-label="Loading the calendar">
      <header className="calendar-head">
        <h1>Calendar</h1>
      </header>
      <div className="calendar-toolbar" aria-hidden="true">
        <span className="skeleton-line" style={{ width: 220, height: 28 }} />
      </div>
      <div className="cal-skeleton" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span key={index} className="skeleton-line" />
        ))}
      </div>
    </div>
  );
}
