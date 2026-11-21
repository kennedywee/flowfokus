import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
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
  SelectionAction,
  SelectionBar,
  type ListColumn,
} from "@/components/parts/ListTable";
import { Dot, Tile } from "@/components/parts/marks";
import { rangeIds, toggleId } from "@/lib/list-parts";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd, initials } from "../../components/ui";
import { failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { isEditable, useShortcut } from "../../lib/shortcuts";
import { attendBooking } from "../../lib/staff.functions";
import { useNow } from "../../lib/use-now";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Section } from "../members/Section";
import { KIND_ICON } from "../programs/kinds";
import { ArrivalRibbon } from "./ArrivalRibbon";
import { arrivedText, clockStat } from "./arrival";
import { BookMemberDialog } from "./BookMember";
import {
  bookingDay,
  cancelNote,
  clockRange,
  groupBookings,
  holderNote,
  rightLabel,
  sessionName,
  sessionState,
  sessionStatusText,
  shortDay,
} from "./facts";
import { AttendanceMark, OccurrenceMark } from "./marks";
import { CancelBookingDialog, CancelSessionDialog } from "./SessionDialogs";

type Roster = Schemas["Roster"];
type Booking = Schemas["Booking"];

const sendAttend = (input: Parameters<typeof attendBooking>[0]["data"]) => attendBooking({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;

/** The clock moves every 30 seconds, so "Starts in 20 min" and the Now pin stay close to true. */
const TICK = 30_000;

const COLUMNS: ListColumn[] = [
  { id: "who", label: "Member" },
  { id: "right", label: "Booked with", width: "minmax(0, 280px)" },
  { id: "when", label: "Time", width: "112px", align: "end" },
  { id: "menu", label: "Actions", width: "28px", hideLabel: true },
];

/**
 * One session, on the shared detail layout (Paper "Session details"): the
 * date and time at display size with the "Starts in" stat, the arrival ribbon,
 * the bookings in three groups, and the details on the right. Book member (B)
 * and ⋯ (Open program, Cancel session…) are in the top bar. Check in works
 * from a row (the status mark, A, or the ⋯ menu) or from the floating bar on
 * chosen rows. Every fact comes from the Rails roster. Left out, because Rails
 * cannot supply them (issue #20): No-show, arrival times before check-in, the
 * unpaid state of a sale on a booking, staff hosts, notes, and activity.
 */
export function SessionDetails({ roster, loadedAt }: { roster: Roster; loadedAt: number }) {
  const organization = useOrganization();
  const can = useCan();
  const now = useNow(loadedAt, TICK);
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const tz = organization.timezone;
  const state = sessionState(roster, new Date(now));
  const open = state === "open" || state === "full";
  const canBook = open && (can("bookings:create") || can("purchases:create"));
  const canCancel = open && can("programs:manage");
  const stat = clockStat(roster, now);
  useShortcut("b", () => setBooking(true), { enabled: canBook });

  return (
    <DetailLayout record="session" className="session-details" panel={<Panel roster={roster} now={now} />}>
      <DetailHero
        size="display"
        title={sessionName(roster.starts_at, tz)}
        line={roster.cancelled_at ? (roster.cancel_reason ? `Cancelled · ${roster.cancel_reason}` : "Cancelled") : undefined}
        stats={stat ? [{ value: stat.value, label: stat.label, above: true }] : undefined}
      />
      <PageActions>
        {canBook ? (
          <Button type="button" size="compact" aria-keyshortcuts="B" aria-haspopup="dialog" onClick={() => setBooking(true)}>
            Book member
            <Kbd>B</Kbd>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
            <Icon name="more" {...icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link to="/$org/programs/$programId" params={{ org: organization.slug, programId: roster.program.id }} />}>
              <Icon name="programs" {...icon} />
              Open program
            </DropdownMenuItem>
            {canCancel ? (
              <DropdownMenuItem className="menu__item--critical" onClick={() => setCancelling(true)}>
                <Icon name="close" {...icon} />
                Cancel session…
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageActions>

      {roster.cancelled_at ? null : <ArrivalRibbon roster={roster} now={now} />}
      <Bookings roster={roster} now={now} canBook={canBook} onBook={() => setBooking(true)} />

      {booking && canBook ? <BookMemberDialog roster={roster} onClose={() => setBooking(false)} /> : null}
      {cancelling && canCancel ? <CancelSessionDialog roster={roster} onClose={() => setCancelling(false)} /> : null}
    </DetailLayout>
  );
}

/* ---------- Bookings ---------- */

/**
 * Here (checked in, in the order they arrived), To arrive (booked or held, not
 * checked in), and Cancelled (cancelled or expired; folded unless it is all
 * there is). The checkbox on a To arrive row chooses it for Check in. A held
 * spot waits for payment, and a member checked in or cancelled needs no
 * action, so those rows have no checkbox.
 */
function Bookings({ roster, now, canBook, onBook }: { roster: Roster; now: number; canBook: boolean; onBook: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const organization = useOrganization();
  const groups = useMemo(() => groupBookings(roster.bookings), [roster.bookings]);
  const here = useMemo(
    () => [...groups.attended].sort((a, b) => (a.attended_at ?? "").localeCompare(b.attended_at ?? "") || a.id.localeCompare(b.id)),
    [groups.attended],
  );
  const manage = can("bookings:manage") && !roster.cancelled_at;
  const checkable = useMemo(() => (manage ? groups.not_marked.filter((booking) => booking.status === "confirmed") : []), [manage, groups.not_marked]);
  const order = useMemo(() => checkable.map((booking) => booking.id), [checkable]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const anchor = useRef<string | null>(null);
  const [bulk, setBulk] = useState(false);
  // The live lock: a Try again from an older toast must not run beside a batch.
  const running = useRef(false);
  // Rows that left To arrive (checked in, cancelled) drop out of the selection by themselves.
  const chosen = useMemo(() => new Set(order.filter((id) => picked.has(id))), [order, picked]);

  function choose(id: string, on: boolean, range: boolean) {
    if (range && anchor.current) {
      const ids = rangeIds(order, anchor.current, id);
      setPicked((current) => new Set(on ? [...current, ...ids] : [...current].filter((item) => !ids.includes(item))));
    } else {
      setPicked((current) => toggleId(current, id, on));
      anchor.current = id;
    }
  }

  // Rails marks one booking per call and ignores a booking that is already checked in, so a retry is safe.
  // `retry` holds the ids that failed last time, so Try again never resends the ones that worked.
  async function checkInChosen(retry?: readonly string[]) {
    const ids = retry ? [...retry] : order.filter((id) => chosen.has(id));
    if (running.current || !ids.length) return;
    running.current = true;
    setBulk(true);
    const failed: { id: string; name: string; message: string }[] = [];
    for (const id of ids) {
      const target = roster.bookings.find((booking) => booking.id === id);
      const name = target?.attendee_name ?? "A member";
      try {
        const result = await sendAttend({ slug: organization.slug, id });
        if (!result.ok) failed.push({ id, name, message: failureMessage(result.error) });
      } catch {
        failed.push({ id, name, message: "The connection failed." });
      }
    }
    running.current = false;
    setBulk(false);
    const done = ids.length - failed.length;
    setPicked(new Set(failed.map((item) => item.id)));
    if (!failed.length) {
      toast.show({ tone: "success", title: done === 1 ? "1 member checked in" : `${done} members checked in` });
    } else {
      toast.show({
        tone: "error",
        title: done ? `${done} of ${ids.length} checked in` : "Nobody was checked in",
        body: `${failed.map((item) => item.name).join(", ")} ${failed.length === 1 ? "was" : "were"} not checked in. ${failed[0]?.message ?? ""}`,
        action: { label: "Try again", onClick: () => void checkInChosen(failed.map((item) => item.id)) },
      });
    }
    void router.invalidate();
  }

  if (!roster.bookings.length) {
    return (
      <Section id="session-bookings" title="Bookings">
        <ListTable label="Bookings" density="one-line" className="list-table--bare session-bookings" columns={COLUMNS}>
          <ListTableEmpty
            title="No bookings yet"
            action={
              canBook ? (
                <Button type="button" variant="secondary" size="compact" onClick={onBook}>
                  Book member
                </Button>
              ) : undefined
            }
          />
        </ListTable>
      </Section>
    );
  }

  const cancelledOpen = Boolean(roster.cancelled_at) || (!here.length && !groups.not_marked.length);
  return (
    <Section id="session-bookings" title="Bookings">
      <ListTable
        label="Bookings"
        density="one-line"
        className="list-table--bare session-bookings"
        columns={COLUMNS}
        selection={order.length ? { chosen: chosen.size, total: order.length, onToggleAll: (on) => setPicked(on ? new Set(order) : new Set()) } : undefined}
      >
        {here.length ? (
          <ListGroup mark={<AttendanceMark status="attended" />} label="Here" count={here.length}>
            <ListTableBody>
              {here.map((item) => (
                <BookingRow key={item.id} booking={item} roster={roster} now={now} />
              ))}
            </ListTableBody>
          </ListGroup>
        ) : null}
        {groups.not_marked.length ? (
          <ListGroup mark={<AttendanceMark status="not_marked" />} label="To arrive" count={groups.not_marked.length}>
            <ListTableBody>
              {groups.not_marked.map((item) => (
                <BookingRow
                  key={item.id}
                  booking={item}
                  roster={roster}
                  now={now}
                  selected={chosen.has(item.id)}
                  onSelectedChange={(on, details) => choose(item.id, on, details.range)}
                  busy={bulk}
                />
              ))}
            </ListTableBody>
          </ListGroup>
        ) : null}
        {groups.cancelled.length ? (
          <ListGroup mark={<AttendanceMark status="cancelled" />} label="Cancelled" count={groups.cancelled.length} defaultOpen={cancelledOpen}>
            <ListTableBody>
              {groups.cancelled.map((item) => (
                <BookingRow key={item.id} booking={item} roster={roster} now={now} />
              ))}
            </ListTableBody>
          </ListGroup>
        ) : null}
      </ListTable>
      <SelectionBar count={chosen.size} onClear={() => setPicked(new Set())}>
        <SelectionAction icon="check" tone="good" onClick={() => void checkInChosen()}>
          {bulk ? "Checking in…" : "Check in"}
        </SelectionAction>
      </SelectionBar>
    </Section>
  );
}

/**
 * One booking. `ListTableBody` hands a row its `band`; this passes it on.
 * The mark of a To arrive row checks the member in, as the ⋯ menu and A do.
 */
function BookingRow({
  booking,
  roster,
  now,
  selected = false,
  onSelectedChange,
  busy = false,
  band,
}: {
  booking: Booking;
  roster: Roster;
  now: number;
  selected?: boolean;
  onSelectedChange?: (on: boolean, details: { range: boolean }) => void;
  busy?: boolean;
  band?: Parameters<typeof ListTableRow>[0]["band"];
}) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const attend = useAction(sendAttend);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const tz = organization.timezone;
  const name = booking.attendee_name;
  // Rails checks a booked spot in and cancels a booked spot. A held spot waits for payment.
  const live = booking.status === "confirmed";
  const manage = can("bookings:manage") && live && !roster.cancelled_at;
  const held = booking.status === "held";
  const gone = booking.status === "cancelled" || booking.status === "expired";
  const note = [holderNote(booking), gone ? cancelNote(booking, roster.cancel_reason) : null].filter(Boolean).join(" · ");
  const when = bookingWhen(booking, now, tz);
  const rowActions = manage || booking.member !== null || booking.sale_id !== null;
  const checkable = manage && !busy;

  async function checkIn() {
    if (!manage || attend.pending || busy) return;
    const result = await attend.run({ slug: organization.slug, id: booking.id });
    if (result.ok) {
      toast.show({ tone: "success", title: `${name} checked in` });
      void router.invalidate();
    } else {
      toast.show({
        tone: "error",
        title: `${name} was not checked in`,
        body: failureMessage(result.error),
        action: { label: "Try again", onClick: () => void checkIn() },
      });
    }
  }

  // A checks in the focused row, as in Paper.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key.toLowerCase() !== "a" || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
    if (!manage) return;
    event.preventDefault();
    void checkIn();
  }

  // Right-click opens the row menu. The ⋯ button opens it too.
  function onContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (!rowActions) return;
    event.preventDefault();
    setMenuOpen(true);
  }

  const person = booking.member ? (
    <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: booking.member.id }} className="session-row__name">
      {name}
    </Link>
  ) : (
    <span className="session-row__name">{name}</span>
  );

  return (
    <ListTableRow
      className="session-row"
      band={band}
      selected={selected}
      unselectable={!manage}
      selectLabel={`Choose ${name}`}
      onSelectedChange={onSelectedChange}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
    >
      <ListTableCell className="session-row__who-cell">
        {manage ? (
          <button type="button" className="session-row__mark" aria-label={`Check in ${name}`} title="Check in" disabled={!checkable || attend.pending} onClick={() => void checkIn()}>
            <AttendanceMark status="not_marked" />
            <Icon name="check" size={10} className="session-row__tick" {...icon} />
          </button>
        ) : (
          <span className="session-row__mark" role="img" aria-label={statusWords(booking)}>
            <AttendanceMark status={booking.status === "confirmed" ? "not_marked" : booking.status} />
          </span>
        )}
        <Tile size="small">{initials(name).slice(0, 2)}</Tile>
        <span className="session-row__who">
          {person}
          {note ? <span className="session-row__note">{note}</span> : null}
        </span>
      </ListTableCell>
      <ListTableCell className="session-row__right">
        {held ? (
          <span className="session-row__waiting">
            <Dot tone="warning" />
            Awaiting payment
          </span>
        ) : null}
        <span className="session-row__chip">
          <Icon name={booking.source === "ticket" ? "pass" : "payments"} size={14} {...icon} />
          {rightLabel(booking)}
        </span>
      </ListTableCell>
      <ListTableCell align="end" className="session-row__when" data-kind={booking.status === "attended" ? "here" : undefined}>
        <span suppressHydrationWarning>{when}</span>
      </ListTableCell>
      <ListTableCell align="end">
        {rowActions ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="session-row__more" aria-label={`Actions for ${name}`}>
              <Icon name="more" {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {manage ? (
                <DropdownMenuItem onClick={() => void checkIn()}>
                  <Icon name="check" {...icon} />
                  Check in
                  <DropdownMenuShortcut>A</DropdownMenuShortcut>
                </DropdownMenuItem>
              ) : null}
              {booking.member ? (
                <DropdownMenuItem render={<Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: booking.member.id }} />}>
                  <Icon name="profile" {...icon} />
                  Open member
                </DropdownMenuItem>
              ) : null}
              {booking.sale_id ? (
                <DropdownMenuItem render={<Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: booking.sale_id }} />}>
                  <Icon name="pass" {...icon} />
                  Open sale
                </DropdownMenuItem>
              ) : null}
              {manage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="menu__item--critical" onClick={() => setCancelling(true)}>
                    <Icon name="close" {...icon} />
                    Cancel booking…
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {cancelling ? <CancelBookingDialog booking={booking} onClose={() => setCancelling(false)} /> : null}
      </ListTableCell>
    </ListTableRow>
  );
}

/** The time on the right of a row: when a member arrived, or the day the spot was booked or cancelled. */
function bookingWhen(booking: Booking, now: number, timeZone: string): string {
  if (booking.status === "attended" && booking.attended_at) return arrivedText(booking.attended_at, timeZone, now);
  const day = bookingDay(booking);
  return day ? shortDay(day, timeZone, new Date(now)) : "";
}

function statusWords(booking: Booking): string {
  switch (booking.status) {
    case "attended":
      return "Checked in";
    case "held":
      return "Held for payment";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Hold expired";
    default:
      return "Not checked in";
  }
}

/* ---------- The panel ---------- */

function Value({ icon: name, children }: { icon: Parameters<typeof Icon>[0]["name"]; children: ReactNode }) {
  return (
    <span className="program-value">
      <Icon name={name} size={14} {...icon} />
      <span>{children}</span>
    </span>
  );
}

/** Program (a link), Host (text: Rails has free-text hosts), Location when there are several, Time, and Status. */
function Panel({ roster, now }: { roster: Roster; now: number }) {
  const organization = useOrganization();
  const state = sessionState(roster, new Date(now));
  return (
    <PanelGroup title="Details">
      <PanelRows>
        <PanelRow label="Program">
          <Value icon={KIND_ICON[roster.program.kind]}>
            <Link to="/$org/programs/$programId" params={{ org: organization.slug, programId: roster.program.id }} className="session-details__program">
              {roster.program.name}
            </Link>
          </Value>
        </PanelRow>
        <PanelRow label="Host">
          <Value icon="profile">{roster.program.host_name ?? "No host"}</Value>
        </PanelRow>
        {organization.locations.length > 1 ? (
          <PanelRow label="Location">
            <Value icon="location">{roster.program.location_name}</Value>
          </PanelRow>
        ) : null}
        <PanelRow label="Time">
          <Value icon="length">{clockRange(roster.starts_at, roster.ends_at, organization.timezone)}</Value>
        </PanelRow>
        <PanelRow label="Status">
          <span className="program-value session-details__status" data-state={state}>
            <OccurrenceMark occurrence={roster} now={new Date(now)} />
            <span suppressHydrationWarning>{sessionStatusText(roster, new Date(now))}</span>
          </span>
        </PanelRow>
      </PanelRows>
    </PanelGroup>
  );
}

/* ---------- Loading and not found ---------- */

/** Keeps the page shape while the session loads, so nothing jumps. */
export function SessionLoading() {
  return (
    <DetailLayout record="session" className="session-details">
      <div role="status" aria-busy="true" aria-label="Loading the session" className="session-loading">
        <header className="hero" data-size="display">
          <div className="hero__text">
            <span className="skeleton session-loading__title" />
          </div>
        </header>
        <Section id="session-loading" title="Bookings">
          <ListTable label="Bookings (loading)" density="one-line" className="list-table--bare session-bookings" columns={COLUMNS}>
            <ListTableLoading rows={4} label="Loading bookings" />
          </ListTable>
        </Section>
      </div>
    </DetailLayout>
  );
}

/** Paper "Did not load": one line and the way back. A network error offers Try again. */
export function SessionDidNotLoad({ notFound, message }: { notFound: boolean; message: string }) {
  const organization = useOrganization();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="page session-page">
      <div className="list-state" role="alert">
        <p className="list-state__title">{notFound ? "This session was not found." : "This session did not load."}</p>
        {notFound ? null : <p className="list-state__text">{message}</p>}
        {notFound ? (
          <Link to="/$org/calendar" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Back to Calendar
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
