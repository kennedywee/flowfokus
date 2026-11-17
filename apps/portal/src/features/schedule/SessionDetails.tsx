import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import {
  CalendarCheck,
  CalendarX2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Clock,
  CreditCard,
  MapPin,
  MoreHorizontal,
  Table2,
  Ticket,
  User,
  Users,
  X,
} from "lucide-react";
import { PageActions } from "../../components/PageActions";
import { useToast } from "../../components/Toast";
import { Kbd, initials } from "../../components/ui";
import { PROGRAM_KIND_LABEL, failureMessage } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useCan, useOrganization } from "../../lib/organization";
import { isEditable, useShortcut } from "../../lib/shortcuts";
import { attendBooking } from "../../lib/staff.functions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookMemberDialog } from "./BookMember";
import {
  bookingDay,
  cancelNote,
  capacityText,
  clockRange,
  groupBookings,
  holderNote,
  rightLabel,
  sessionState,
  sessionStatusText,
  sessionTitle,
  shortDay,
  type BookingGroup,
} from "./facts";
import { AttendanceMark, OccurrenceMark } from "./marks";
import { CancelBookingDialog, CancelSessionDialog } from "./SessionDialogs";

type Roster = Schemas["Roster"];
type Booking = Schemas["Booking"];

const sendAttend = (input: Parameters<typeof attendBooking>[0]["data"]) => attendBooking({ data: input });

const icon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

const GROUP_TITLE: Record<BookingGroup, string> = {
  not_marked: "Not marked",
  attended: "Attended",
  cancelled: "Cancelled",
};

/**
 * One session: who is booked, what is marked, and what was cancelled, with
 * the session's properties on the right. Book member (B) and the ⋯ menu sit in
 * the top bar. Every fact comes from the Rails roster.
 */
export function SessionDetails({ roster }: { roster: Roster }) {
  const organization = useOrganization();
  const can = useCan();
  const [booking, setBooking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const state = sessionState(roster);
  const open = state === "open" || state === "full";
  const canBook = open && (can("bookings:create") || can("purchases:create"));
  const canCancel = open && can("programs:manage");
  const groups = groupBookings(roster.bookings);
  const anyBookings = roster.bookings.length > 0;
  useShortcut("b", () => setBooking(true), { enabled: canBook });

  return (
    <div className="page session-page">
      <header className="session-head">
        <span className="session-head__tile" aria-hidden="true">
          <Users strokeWidth={1.5} />
        </span>
        <div className="session-head__text">
          <h1>{sessionTitle(roster.starts_at, roster.ends_at, organization.timezone)}</h1>
          <p className="session-head__meta">
            {roster.program.name} · {PROGRAM_KIND_LABEL[roster.program.kind]}
          </p>
        </div>
        <PageActions>
          {canBook ? (
            <Button
              type="button"
              variant="secondary"
              size="compact"
              className="session-head__book"
              aria-keyshortcuts="B"
              aria-haspopup="dialog"
              onClick={() => setBooking(true)}
            >
              Book member
              <Kbd>B</Kbd>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon-compact" })} aria-label="More actions">
              <MoreHorizontal {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={<Link to="/$org/programs/$programId" params={{ org: organization.slug, programId: roster.program.id }} />}
              >
                <CalendarCheck {...icon} />
                Open program
              </DropdownMenuItem>
              {canCancel ? (
                <DropdownMenuItem className="menu__item--critical" onClick={() => setCancelling(true)}>
                  <CalendarX2 {...icon} />
                  Cancel session…
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </PageActions>
      </header>

      <Properties roster={roster} />

      <div className="session-page__roster">
        {anyBookings ? (
          <section className="session-roster" aria-label="Bookings">
            {(["not_marked", "attended", "cancelled"] as const).map((group) =>
              groups[group].length ? (
                <BookingBand
                  key={group}
                  group={group}
                  bookings={groups[group]}
                  roster={roster}
                  startOpen={group !== "cancelled" || state === "cancelled" || (!groups.not_marked.length && !groups.attended.length)}
                />
              ) : null,
            )}
          </section>
        ) : (
          <div className="list-state" role="status">
            <p className="list-state__title">No bookings yet.</p>
            {canBook ? (
              <Button type="button" variant="secondary" size="compact" onClick={() => setBooking(true)}>
                Book member
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {booking ? <BookMemberDialog roster={roster} onClose={() => setBooking(false)} /> : null}
      {cancelling ? <CancelSessionDialog roster={roster} onClose={() => setCancelling(false)} /> : null}
    </div>
  );
}

/* ---------- Roster ---------- */

function BookingBand({ group, bookings, roster, startOpen }: { group: BookingGroup; bookings: Booking[]; roster: Roster; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const id = `session-group-${group}`;
  return (
    <div className="session-group">
      <h2 className="session-band">
        <button type="button" className="session-band__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span className="session-band__chevron">{open ? <ChevronDown {...icon} /> : <ChevronRight {...icon} />}</span>
          <span className="session-band__mark">
            <AttendanceMark status={group === "attended" ? "attended" : group === "cancelled" ? "cancelled" : "not_marked"} />
          </span>
          <span className="session-band__title">{GROUP_TITLE[group]}</span>
          <span className="session-band__count">{bookings.length}</span>
        </button>
      </h2>
      {open ? (
        <ul className="session-rows" id={id}>
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} roster={roster} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BookingRow({ booking, roster }: { booking: Booking; roster: Roster }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const attend = useAction(sendAttend);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const tz = organization.timezone;
  const live = booking.status === "confirmed";
  // Rails marks a booked spot present and cancels a booked spot. Held spots wait for payment.
  const canManage = can("bookings:manage") && live && !roster.cancelled_at;
  const name = booking.attendee_name;
  const note = booking.status === "cancelled" || booking.status === "expired" ? cancelNote(booking, roster.cancel_reason) : null;
  const who = holderNote(booking);
  const day = bookingDay(booking);
  const rowActions = canManage || booking.member !== null || booking.sale_id !== null;

  async function markAttended() {
    if (!canManage || attend.pending) return;
    const result = await attend.run({ slug: organization.slug, id: booking.id });
    if (result.ok) {
      toast.show({ tone: "success", title: `${name} marked attended` });
      void router.invalidate();
    } else {
      toast.show({
        tone: "error",
        title: `${name} was not marked attended`,
        body: failureMessage(result.error),
        action: { label: "Try again", onClick: () => void markAttended() },
      });
    }
  }

  // A marks attendance on the focused row, as in Paper.
  function onKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (event.key.toLowerCase() !== "a" || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
    if (!canManage) return;
    event.preventDefault();
    void markAttended();
  }

  // Right-click opens the row menu, as in Paper. The ⋯ button opens it too.
  function onContextMenu(event: MouseEvent<HTMLLIElement>) {
    if (!rowActions) return;
    event.preventDefault();
    setMenuOpen(true);
  }

  const memberLink = booking.member ? (
    <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: booking.member.id }} className="session-row__name">
      {name}
    </Link>
  ) : (
    <span className="session-row__name">{name}</span>
  );
  const facts = [who, note].filter(Boolean).join(" · ");

  return (
    <li className="session-row" data-status={booking.status} onKeyDown={onKeyDown} onContextMenu={onContextMenu}>
      <span className="session-row__slot" aria-hidden="true" />
      <span className="session-row__mark">
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="session-row__mark-button" aria-label={`Attendance for ${name}: not marked. Change`} disabled={attend.pending}>
              <AttendanceMark status="not_marked" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="attendance-menu">
              <DropdownMenuItem disabled>
                <AttendanceMark status="not_marked" />
                Not marked
                <DropdownMenuShortcut>
                  <CircleCheck {...icon} />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void markAttended()}>
                <AttendanceMark status="attended" />
                Attended
                <DropdownMenuShortcut>A</DropdownMenuShortcut>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span role="img" aria-label={statusWords(booking)}>
            <AttendanceMark status={booking.status === "confirmed" ? "not_marked" : booking.status} />
          </span>
        )}
      </span>
      <span className="session-row__avatar" aria-hidden="true">
        {initials(name).slice(0, 1)}
      </span>
      <span className="session-row__who">
        {memberLink}
        {facts ? <span className="session-row__note">{facts}</span> : null}
        <span className="session-row__phone-line" suppressHydrationWarning>
          {[booking.status === "held" ? "Awaiting payment" : null, rightLabel(booking), day ? `Booked ${shortDay(day, tz).replace(/^(Today|Yesterday)$/, (word) => word.toLowerCase())}` : null]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="session-row__chips">
        {booking.status === "held" ? (
          <span className="session-chip">
            <span className="session-chip__dot" data-tone="warning" aria-hidden="true" />
            Awaiting payment
          </span>
        ) : null}
        <RightChip booking={booking} />
      </span>
      <span className="session-row__day">{day ? <span suppressHydrationWarning>{shortDay(day, tz)}</span> : null}</span>
      <span className="session-row__menu">
        {rowActions ? (
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="session-row__more" aria-label={`Actions for ${name}`}>
              <MoreHorizontal {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManage ? (
                <DropdownMenuItem onClick={() => void markAttended()}>
                  <AttendanceMark status="attended" />
                  Mark attended
                  <DropdownMenuShortcut>A</DropdownMenuShortcut>
                </DropdownMenuItem>
              ) : null}
              {booking.member ? (
                <DropdownMenuItem render={<Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: booking.member.id }} />}>
                  <User {...icon} />
                  Open member
                </DropdownMenuItem>
              ) : null}
              {booking.sale_id ? (
                <DropdownMenuItem render={<Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: booking.sale_id }} />}>
                  <Ticket {...icon} />
                  Open sale
                </DropdownMenuItem>
              ) : null}
              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="menu__item--critical" onClick={() => setCancelling(true)}>
                    <X {...icon} />
                    Cancel booking…
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </span>
      {cancelling ? <CancelBookingDialog booking={booking} onClose={() => setCancelling(false)} /> : null}
    </li>
  );
}

function statusWords(booking: Booking): string {
  switch (booking.status) {
    case "attended":
      return "Attended";
    case "held":
      return "Held for payment";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Hold expired";
    default:
      return "Not marked";
  }
}

/** The pass, membership, or ticket that holds the spot. */
function RightChip({ booking }: { booking: Booking }) {
  const Icon = booking.source === "ticket" ? Ticket : CreditCard;
  return (
    <span className="session-chip">
      <Icon {...icon} />
      {rightLabel(booking)}
    </span>
  );
}

/* ---------- Properties ---------- */

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-prop">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Properties({ roster }: { roster: Roster }) {
  const organization = useOrganization();
  const state = sessionState(roster);
  return (
    <aside className="mx-props session-props" aria-label="Session details">
      <section className="mx-props__group" aria-labelledby="session-props-title">
        <h2 id="session-props-title">Details</h2>
        <dl>
          <Property label="Program">
            <span className="mx-value">
              <Users {...icon} />
              <Link to="/$org/programs/$programId" params={{ org: organization.slug, programId: roster.program.id }}>
                {roster.program.name}
              </Link>
            </span>
          </Property>
          <Property label="Host">
            <span className="mx-value">
              <User {...icon} />
              <span className="mx-value__text">{roster.program.host_name ?? "No host"}</span>
            </span>
          </Property>
          {organization.locations.length > 1 ? (
            <Property label="Location">
              <span className="mx-value">
                <MapPin {...icon} />
                <span className="mx-value__text">{roster.program.location_name}</span>
              </span>
            </Property>
          ) : null}
          <Property label="Time">
            <span className="mx-value">
              <Clock {...icon} />
              <span className="mx-value__text money">{clockRange(roster.starts_at, roster.ends_at, organization.timezone)}</span>
            </span>
          </Property>
          <Property label="Capacity">
            <span className="mx-value">
              <Table2 {...icon} />
              <span className="mx-value__text money" suppressHydrationWarning>
                {capacityText(roster)}
              </span>
            </span>
          </Property>
          <Property label="Status">
            <span className="mx-value session-props__status" data-state={state}>
              <OccurrenceMark occurrence={roster} />
              <span className="mx-value__text" suppressHydrationWarning>
                {sessionStatusText(roster)}
              </span>
            </span>
          </Property>
          {roster.cancel_reason ? (
            <Property label="Reason">
              <span className="mx-value session-props__reason">
                <span className="mx-value__text">{roster.cancel_reason}</span>
              </span>
            </Property>
          ) : null}
        </dl>
      </section>
    </aside>
  );
}

/* ---------- Loading and not found ---------- */

/** Paper "Loading": a skeleton title, rows, and Details. */
export function SessionLoading() {
  return (
    <div className="page session-page" role="status" aria-busy="true" aria-label="Loading the session">
      <header className="session-head" aria-hidden="true">
        <span className="session-head__tile skeleton-block" />
        <div className="session-head__text">
          <span className="skeleton-line" style={{ width: 220, height: 16 }} />
          <span className="skeleton-line" style={{ width: 150 }} />
        </div>
      </header>
      <aside className="mx-props session-props" aria-hidden="true">
        <div className="mx-props__group">
          <h2>Details</h2>
          {[60, 50, 56].map((width, index) => (
            <div key={index} className="mx-prop">
              <span className="skeleton-line" style={{ width }} />
              <span className="skeleton-line" style={{ width: 110, marginLeft: 16 }} />
            </div>
          ))}
        </div>
      </aside>
      <div className="session-page__roster" aria-hidden="true">
        <div className="session-roster">
          <div className="session-band">
            <span className="skeleton-line" style={{ width: 120 }} />
          </div>
          {[160, 200, 140].map((width, index) => (
            <div key={index} className="session-row session-row--skeleton">
              <span className="session-row__avatar skeleton-block" />
              <span className="skeleton-line" style={{ width }} />
              <span className="skeleton-line session-row__chip-skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
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
          <Link to="/$org/schedule" params={{ org: organization.slug }} className={buttonVariants({ variant: "secondary", size: "compact" })}>
            Back to Schedule
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
