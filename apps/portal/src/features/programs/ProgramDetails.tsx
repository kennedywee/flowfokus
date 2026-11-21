import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { DetailHero, DetailLayout, PanelGroup, PanelRow, PanelRows } from "@/components/parts/DetailLayout";
import {
  ListGroup,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableEmpty,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { SpotRow } from "@/components/parts/marks";
import { PageActions } from "../../components/PageActions";
import { Kbd } from "../../components/ui";
import { PROGRAM_KIND_LABEL, formatMoney } from "../../lib/format";
import { useCan, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, Section } from "../members/Section";
import { BookMemberDialog } from "../schedule/BookMember";
import { clockRange, dayKey, sessionName } from "../schedule/facts";
import { bookableSessions, lengthText, pricesOnSale, PRICE_STATE_LABEL, priceState } from "./facts";
import { KIND_ICON } from "./kinds";
import { AddSessionsDialog, NewTicketDialog, TicketMenu } from "./ProgramDialogs";
import { usePublishProgram } from "./publish";
import { SessionsChart } from "./SessionsChart";
import {
  SESSION_PREVIEW,
  chartFor,
  fillRate,
  groupByWeek,
  isOver,
  programSessions,
  spotsText,
  splitSessions,
  waysToBook,
  weekLabel,
  type Way,
} from "./sessions";

type Program = Schemas["ProgramDetail"];
type Occurrence = Schemas["Occurrence"];
type Open = "sessions" | "ticket" | "book" | "sell" | null;

const icon = { "aria-hidden": true, focusable: false } as const;

/**
 * Paper "Program details": the name at display size with the fill rate, the
 * chart of the last week and the next 30 days, Sessions, Ways to book, and the
 * details on the right. Book member (B) and Sell ticket (S) are in the top bar
 * with ⋯ (Publish, Edit program); Add sessions (T) is in the Sessions header.
 * Every fact comes from the Rails program and the Rails schedule. Left out,
 * because Rails cannot supply them (issue #20): the weekly pattern line, the
 * bookings per way to book with their mix bar, the activity and comments, and
 * staff hosts.
 */
export function ProgramDetails({
  program,
  history,
  loadedAt,
}: {
  program: Program;
  /** The schedule from about two months ago, or null when it did not load. */
  history: Schemas["ScheduleEntry"][] | null;
  /** When the route loaded the program. The server render and the first browser render both use it. */
  loadedAt: number;
}) {
  const organization = useOrganization();
  const can = useCan();
  const publish = usePublishProgram();
  const [open, setOpen] = useState<Open>(null);
  const [publishing, setPublishing] = useState(false);
  // Every time on the page reads this one clock. It moves to the browser's own after hydration.
  const [clock, setClock] = useState<number | null>(null);
  useEffect(() => setClock(Date.now()), [loadedAt]);
  const now = clock ?? loadedAt;
  const tz = organization.timezone;
  const manage = can("programs:manage");
  const sessions = useMemo(() => programSessions(program.occurrences, history, program.id), [program.occurrences, history, program.id]);
  const bookable = bookableSessions(program.occurrences);
  const onSale = pricesOnSale(program);
  const canBook = bookable.length > 0 && (can("bookings:create") || can("purchases:create"));
  const canSell = bookable.length > 0 && onSale.length > 0 && can("purchases:create");
  const rate = fillRate(sessions, now, tz, history !== null);
  const chart = useMemo(() => chartFor(sessions, now, tz), [sessions, now, tz]);

  async function togglePublished() {
    if (publishing) return;
    setPublishing(true);
    await publish(program.id, !program.published);
    setPublishing(false);
  }

  useShortcut("t", () => setOpen("sessions"), { enabled: manage });
  useShortcut("s", () => setOpen("sell"), { enabled: canSell });
  useShortcut("b", () => setOpen("book"), { enabled: canBook });
  useShortcut("p", () => void togglePublished(), { enabled: manage, shift: true });

  return (
    <DetailLayout record="program" className="program-details" panel={<Panel program={program} />}>
      <DetailHero
        size="display"
        title={program.name}
        stats={rate ? [{ value: `${rate.percent}%`, label: "filled, last 4 weeks" }] : undefined}
      />
      <PageActions>
        {canSell ? (
          <Button type="button" variant="secondary" size="compact" aria-keyshortcuts="S" aria-haspopup="dialog" onClick={() => setOpen("sell")}>
            Sell ticket
            <Kbd>S</Kbd>
          </Button>
        ) : null}
        {canBook ? (
          <Button type="button" size="compact" aria-keyshortcuts="B" aria-haspopup="dialog" onClick={() => setOpen("book")}>
            Book member
            <Kbd>B</Kbd>
          </Button>
        ) : null}
        {manage ? (
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
              <Icon name="more" {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sale-menu">
              <DropdownMenuItem disabled={publishing} onClick={() => void togglePublished()}>
                {program.published ? <Icon name="visibility" {...icon} /> : <Icon name="gymSite" {...icon} />}
                {program.published ? "Make staff only" : "Publish"}
                <DropdownMenuShortcut>⇧P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link to="/$org/programs/$programId/edit" params={{ org: organization.slug, programId: program.id }} />}>
                <Icon name="edit" {...icon} />
                Edit program
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </PageActions>

      {chart ? <SessionsChart chart={chart} now={now} /> : null}
      <Sessions sessions={sessions} history={history !== null} now={now} onAdd={manage ? () => setOpen("sessions") : undefined} />
      <WaysToBook program={program} manage={manage} onAddTicket={() => setOpen("ticket")} />

      {open === "sessions" ? <AddSessionsDialog program={program} onClose={() => setOpen(null)} /> : null}
      {open === "ticket" ? <NewTicketDialog program={program} onClose={() => setOpen(null)} /> : null}
      {open === "book" && canBook ? <BookMemberDialog sessions={bookable} onClose={() => setOpen(null)} /> : null}
      {open === "sell" && canSell ? <BookMemberDialog sessions={bookable} mode="sell" onClose={() => setOpen(null)} /> : null}
    </DetailLayout>
  );
}

/* ---------- Sessions ---------- */

const SESSION_COLUMNS: ListColumn[] = [
  { id: "day", label: "Day", width: "104px" },
  { id: "time", label: "Time" },
  { id: "spots", label: "Booked", width: "228px" },
  { id: "open", label: "Open", width: "16px", hideLabel: true },
];

/** "Thu 5 Nov" in the gym's time zone. */
function sessionDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(",", "");
}

/**
 * The next sessions from today, four to start. "Show all sessions" opens the
 * rest in place: Upcoming and Past, each grouped by week. The earlier sessions
 * come from the schedule; when it did not load, only Upcoming shows.
 */
function Sessions({ sessions, history, now, onAdd }: { sessions: Occurrence[]; history: boolean; now: number; onAdd?: () => void }) {
  const organization = useOrganization();
  const [expanded, setExpanded] = useState(false);
  const tz = organization.timezone;
  const { upcoming, past } = useMemo(() => splitSessions(sessions, now), [sessions, now]);
  const preview = upcoming.slice(0, SESSION_PREVIEW);
  const hasMore = expanded || sessions.length > preview.length;
  const add = onAdd ? (
    <Button type="button" variant="secondary" size="compact" aria-keyshortcuts="T" aria-haspopup="dialog" onClick={onAdd}>
      <Icon name="plus" {...icon} />
      Add sessions
      <Kbd>T</Kbd>
    </Button>
  ) : null;

  return (
    <Section id="program-sessions" title="Sessions" action={add}>
      {!sessions.length ? (
        <Empty>No sessions yet</Empty>
      ) : (
        <>
          <ListTable label="Sessions" density="one-line" className="list-table--bare program-sessions" columns={SESSION_COLUMNS}>
            {expanded ? (
              <>
                <SessionGroup label="Upcoming" sessions={upcoming} now={now} tz={tz} />
                {history || past.length ? <SessionGroup label="Past" sessions={past} now={now} tz={tz} /> : null}
              </>
            ) : preview.length ? (
              <ListTableBody>
                {preview.map((session) => (
                  <SessionRow key={session.id} session={session} now={now} tz={tz} />
                ))}
              </ListTableBody>
            ) : (
              <ListTableEmpty title="No coming sessions" />
            )}
          </ListTable>
          {hasMore ? (
            <button type="button" className="program-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Show fewer sessions" : "Show all sessions"}
              <Icon name="chevronDown" size={12} className="program-more__chevron" {...icon} />
            </button>
          ) : null}
          {expanded && !history ? <p className="program-note">Earlier sessions did not load.</p> : null}
        </>
      )}
    </Section>
  );
}

/** Upcoming or Past: a collapsible group with its sessions, a week at a time. */
function SessionGroup({ label, sessions, now, tz }: { label: string; sessions: Occurrence[]; now: number; tz: string }) {
  const weeks = groupByWeek(sessions, tz);
  return (
    <ListGroup label={label} count={sessions.length}>
      {sessions.length ? (
        <ListTableBody>
          {weeks.flatMap((week) => [
            <WeekRow key={week.week} label={weekLabel(week.week)} />,
            ...week.sessions.map((session) => <SessionRow key={session.id} session={session} now={now} tz={tz} />),
          ])}
        </ListTableBody>
      ) : (
        <p className="program-note">None</p>
      )}
    </ListGroup>
  );
}

/** A quiet label row between weeks. `ListTableBody` hands every row a `band`; a label ignores it. */
function WeekRow({ label }: { label: string; band?: unknown }) {
  return (
    <div role="row" className="program-week">
      <div role="cell" aria-colspan={SESSION_COLUMNS.length}>
        {label}
      </div>
    </div>
  );
}

function SessionRow({ session, now, tz }: { session: Occurrence; now: number; tz: string }) {
  const organization = useOrganization();
  const over = isOver(session, now);
  const cancelled = Boolean(session.cancelled_at);
  const full = !cancelled && session.capacity > 0 && session.spots_taken >= session.capacity;
  const today = dayKey(new Date(now).toISOString(), tz) === dayKey(session.starts_at, tz);
  return (
    <ListTableRow className="program-session" >
      <ListTableCell>
        <Link
          to="/$org/calendar/$occurrenceId"
          params={{ org: organization.slug, occurrenceId: session.id }}
          className="list-table__link program-session__day"
          data-past={over || cancelled || undefined}
          aria-label={`${sessionName(session.starts_at, tz)}, ${spotsText(session)}${cancelled && session.cancel_reason ? `, ${session.cancel_reason}` : ""}`}
        >
          <span suppressHydrationWarning>{sessionDay(session.starts_at, tz)}</span>
        </Link>
      </ListTableCell>
      <ListTableCell className="program-session__time" data-past={over || cancelled || undefined}>
        <span suppressHydrationWarning>{clockRange(session.starts_at, session.ends_at, tz)}</span>
        {today ? <span className="program-session__today">Today</span> : null}
      </ListTableCell>
      <ListTableCell className="program-session__spots" data-state={cancelled ? "cancelled" : full ? "full" : over ? "past" : "open"}>
        <SpotRow capacity={session.capacity} booked={session.spots_taken} state={over ? "past" : "upcoming"} cancelled={cancelled} />
        <span className="program-session__count" suppressHydrationWarning>
          {spotsText(session)}
        </span>
        {cancelled && session.cancel_reason ? <span className="program-session__reason">{session.cancel_reason}</span> : null}
      </ListTableCell>
      <ListTableCell align="end">
        <Icon name="chevronRight" size={14} className="program-session__chevron" {...icon} />
      </ListTableCell>
    </ListTableRow>
  );
}

/* ---------- Ways to book ---------- */

const WAY_COLUMNS: ListColumn[] = [
  { id: "name", label: "Name" },
  { id: "type", label: "Type", width: "128px" },
  { id: "price", label: "Price", width: "112px", align: "end" },
  { id: "menu", label: "Actions", width: "28px", hideLabel: true },
];

/**
 * What can book this program: the memberships and passes that cover it, and
 * its ticket prices. Rails does not count bookings per way, so the table has
 * no Bookings column and no mix bar (issue #20).
 */
function WaysToBook({ program, manage, onAddTicket }: { program: Program; manage: boolean; onAddTicket: () => void }) {
  const ways = waysToBook(program, (price) => formatMoney(price.amount_minor, price.currency));
  const add = manage ? (
    <Button type="button" variant="secondary" size="compact" aria-haspopup="dialog" onClick={onAddTicket}>
      <Icon name="plus" {...icon} />
      Add ticket
    </Button>
  ) : null;
  return (
    <Section id="program-ways" title="Ways to book" action={add}>
      <ListTable label="Ways to book" density="one-line" className="program-ways" columns={WAY_COLUMNS}>
        {ways.length ? (
          <ListTableBody>
            {ways.map((way) => (
              <WayRow key={way.id} way={way} manage={manage} />
            ))}
          </ListTableBody>
        ) : (
          <ListTableEmpty title="Nothing books this program yet" text={manage ? "Add a ticket, or sell a pass or membership that covers it." : undefined} />
        )}
      </ListTable>
    </Section>
  );
}

function WayRow({ way, manage }: { way: Way; manage: boolean }) {
  const state = way.ticket ? priceState(way.ticket) : null;
  return (
    <ListTableRow>
      <ListTableCell className="program-way__name" data-state={state ?? undefined}>
        <span>{way.name}</span>
        {state && state !== "on_sale" ? (
          <span className="program-way__state">
            {state === "archived" ? <Icon name="visibility" size={12} {...icon} /> : <Icon name="close" size={12} {...icon} />}
            {PRICE_STATE_LABEL[state]}
          </span>
        ) : null}
      </ListTableCell>
      <ListTableCell className="cell-muted">{way.type}</ListTableCell>
      <ListTableCell align="end" className="program-way__price" data-state={state ?? undefined}>
        {way.price}
      </ListTableCell>
      <ListTableCell align="end">{way.ticket && manage ? <TicketMenu price={way.ticket} /> : null}</ListTableCell>
    </ListTableRow>
  );
}

/* ---------- The panel ---------- */

function Value({ icon: name, children, empty }: { icon: Parameters<typeof Icon>[0]["name"]; children: ReactNode; empty?: boolean }) {
  return (
    <span className="program-value" data-empty={empty || undefined}>
      <Icon name={name} size={14} {...icon} />
      <span>{children}</span>
    </span>
  );
}

/**
 * Kind, Host (text: Rails has free-text hosts, not staff), Length, Capacity,
 * Visibility, and the location when there are several. The note is Rails'
 * description; it has no author or date, so it shows as plain text.
 */
function Panel({ program }: { program: Program }) {
  const organization = useOrganization();
  return (
    <>
      <PanelGroup title="Details">
        <PanelRows>
          <PanelRow label="Kind">
            <Value icon={KIND_ICON[program.kind]}>{PROGRAM_KIND_LABEL[program.kind]}</Value>
          </PanelRow>
          <PanelRow label="Host">
            <Value icon="profile" empty={!program.host_name}>
              {program.host_name ?? "No host"}
            </Value>
          </PanelRow>
          <PanelRow label="Length">
            <Value icon="length">{lengthText(program.duration_minutes)}</Value>
          </PanelRow>
          <PanelRow label="Capacity">
            <Value icon="capacity">
              {program.capacity} {program.capacity === 1 ? "spot" : "spots"}
            </Value>
          </PanelRow>
          <PanelRow label="Visibility">
            <Value icon={program.published ? "gymSite" : "visibility"}>{program.published ? "Published" : "Staff only"}</Value>
          </PanelRow>
          {organization.locations.length > 1 ? (
            <PanelRow label="Location">
              <Value icon="location">{program.location_name}</Value>
            </PanelRow>
          ) : null}
        </PanelRows>
      </PanelGroup>
      {program.description ? (
        <PanelGroup title="Note">
          <p className="program-note-text">{program.description}</p>
        </PanelGroup>
      ) : null}
    </>
  );
}

/* ---------- Loading and not found ---------- */

/** Keeps the page shape while the program loads, so nothing jumps. */
export function ProgramLoading() {
  return (
    <DetailLayout record="program" className="program-details">
      <div role="status" aria-busy="true" aria-label="Loading the program" className="program-loading">
        <header className="hero" data-size="display">
          <div className="hero__text">
            <span className="skeleton program-loading__title" />
          </div>
        </header>
        <Section id="program-loading" title="Sessions">
          <ListTable label="Sessions (loading)" density="one-line" className="list-table--bare program-sessions" columns={SESSION_COLUMNS}>
            <ListTableLoading rows={4} label="Loading sessions" />
          </ListTable>
        </Section>
      </div>
    </DetailLayout>
  );
}

/** Paper "Not found" and "Did not load": one line and one action. */
export function ProgramDidNotLoad({ notFound, message }: { notFound: boolean; message: string }) {
  const organization = useOrganization();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="page program-page">
      <div className="list-state" role="alert">
        <p className="list-state__title">{notFound ? "This program was not found." : "This program did not load."}</p>
        {notFound ? null : <p className="list-state__text">{message}</p>}
        {notFound ? (
          <Link to="/$org/programs" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Back to Programs
          </Link>
        ) : (
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
        )}
      </div>
    </div>
  );
}
