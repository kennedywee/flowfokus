import { useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { CalendarX2, Check, Ticket, UserPlus, X } from "lucide-react";
import { Combobox } from "../../../components/Combobox";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/Toast";
import { Empty, FailureNotice, Field, Notice, PageHead, Plate, SkeletonRows, Status, describedBy } from "../../../components/ui";
import {
  BOOKING_STATUS_LABEL,
  PROGRAM_KIND_LABEL,
  failureMessage,
  formatDate,
  formatMoney,
  formatTime,
} from "../../../lib/format";
import { useAction, useIdempotencyKey } from "../../../lib/hooks";
import { useCan, useDeskLocation, useOrganization } from "../../../lib/organization";
import {
  attendBooking,
  cancelBooking,
  cancelOccurrence,
  createBooking,
  createSale,
  getBookingOptions,
  getRoster,
  listMembers,
} from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const sendAttend = (input: Parameters<typeof attendBooking>[0]["data"]) => attendBooking({ data: input });
const sendCancelBooking = (input: Parameters<typeof cancelBooking>[0]["data"]) => cancelBooking({ data: input });
const sendCancelTime = (input: Parameters<typeof cancelOccurrence>[0]["data"]) => cancelOccurrence({ data: input });
const sendBooking = (input: Parameters<typeof createBooking>[0]["data"]) => createBooking({ data: input });
const sendSale = (input: Parameters<typeof createSale>[0]["data"]) => createSale({ data: input });
const loadOptions = (input: Parameters<typeof getBookingOptions>[0]["data"]) => getBookingOptions({ data: input });

export const Route = createFileRoute("/$org/schedule/$occurrenceId")({
  loader: async ({ params }) => {
    if (!isUuid(params.occurrenceId)) {
      return {
        roster: { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Time not found" } },
        members: null,
      };
    }
    const [roster, members] = await Promise.all([
      getRoster({ data: { slug: params.org, id: params.occurrenceId } }),
      listMembers({ data: { slug: params.org } }),
    ]);
    return { roster, members };
  },
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: RosterPage,
});

const STATUS_LAMP: Record<Schemas["BookingStatus"], "active" | "waiting" | "delivered" | "off"> = {
  confirmed: "active",
  held: "waiting",
  attended: "delivered",
  cancelled: "off",
  expired: "off",
};

function RosterPage() {
  const { roster, members } = Route.useLoaderData();
  const organization = useOrganization();
  const can = useCan();
  const [cancellingTime, setCancellingTime] = useState(false);

  if (!roster.ok) {
    return (
      <div className="page roster-page">
        <FailureNotice error={roster.error} title="This time did not load" />
      </div>
    );
  }

  const data = roster.data;
  const tz = organization.timezone;
  const live = data.bookings.filter((booking) => booking.status !== "cancelled" && booking.status !== "expired");
  const past = data.bookings.filter((booking) => booking.status === "cancelled" || booking.status === "expired");
  const attended = live.filter((booking) => booking.status === "attended").length;
  const ended = new Date(data.ends_at) <= new Date();
  const open = !data.cancelled_at && !ended;

  return (
    <div className="page roster-page">
      <PageHead
        title={data.program.name}
        description={`${formatDate(data.starts_at, tz)}, ${formatTime(data.starts_at, tz)} to ${formatTime(data.ends_at, tz)} · ${
          data.program.location_name
        }${data.program.host_name ? ` · ${data.program.host_name}` : ""}`}
      >
        <Status state={data.cancelled_at ? "off" : data.spots_left === 0 ? "due" : "active"}>
          {data.cancelled_at ? "Cancelled" : data.spots_left === 0 ? "Full" : `${data.spots_left} spots left`}
        </Status>
        <Link
          to="/$org/programs/$programId"
          params={{ org: organization.slug, programId: data.program.id }}
          className={buttonVariants({ variant: "secondary" })}
        >
          {PROGRAM_KIND_LABEL[data.program.kind]} details
        </Link>
        {can("programs:manage") && open ? (
          <Button type="button" variant="secondary" onClick={() => setCancellingTime(true)}>
            <CalendarX2 aria-hidden="true" />
            Cancel time
          </Button>
        ) : null}
      </PageHead>

      {data.cancelled_at ? (
        <Notice tone="warning" title="This time is cancelled">
          <p>Reason: {data.cancel_reason}. Every booking was cancelled and each use was returned. Refund ticket payments from the sale.</p>
        </Notice>
      ) : null}

      <div className="sale-page__readouts roster-page__readouts">
        <div className="readout">
          <span className="readout__label">Booked</span>
          <span className="readout__value">
            {data.spots_taken} / {data.capacity}
          </span>
        </div>
        <div className="readout">
          <span className="readout__label">Present</span>
          <span className="readout__value">{attended}</span>
        </div>
        <div className="readout">
          <span className="readout__label">Spots left</span>
          <span className="readout__value">{data.spots_left}</span>
        </div>
      </div>

      <div className="program-page__layout">
        <Plate title="Bookings" description={live.length ? "Mark members present when they arrive." : undefined} flush>
          {live.length === 0 ? (
            <Empty title="No bookings yet">
              <p>{open ? "Book a member here, or members book on the gym site." : "Nobody was booked."}</p>
            </Empty>
          ) : (
            <BookingTable bookings={live} />
          )}
          {past.length ? (
            <details className="roster-page__past">
              <summary>Cancelled ({past.length})</summary>
              <BookingTable bookings={past} />
            </details>
          ) : null}
        </Plate>
        {open && (can("bookings:create") || can("purchases:create")) && members?.ok ? (
          <BookMember roster={data} members={members.data} />
        ) : null}
      </div>
      <CancelTimeDialog roster={data} open={cancellingTime} onClose={() => setCancellingTime(false)} />
    </div>
  );
}

function BookingTable({ bookings }: { bookings: Schemas["Booking"][] }) {
  const organization = useOrganization();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Member</TableHead>
          <TableHead scope="col" className="col-wide">
            Booked with
          </TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col">
            <span className="visually-hidden">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>
              <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: booking.member.id }} className="cell-title">
                {booking.member.name}
              </Link>
              <span className="cell-sub">{booking.member.email}</span>
              <span className="cell-sub phone-only">{bookedWith(booking)}</span>
            </TableCell>
            <TableCell className="col-wide">
              {booking.sale_id ? (
                <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: booking.sale_id }}>
                  {bookedWith(booking)}
                </Link>
              ) : (
                bookedWith(booking)
              )}
            </TableCell>
            <TableCell>
              <Status state={STATUS_LAMP[booking.status]}>{BOOKING_STATUS_LABEL[booking.status]}</Status>
              {booking.cancel_reason ? <span className="cell-sub">{booking.cancel_reason}</span> : null}
            </TableCell>
            <TableCell className="cell-actions">
              <BookingActions booking={booking} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function bookedWith(booking: Schemas["Booking"]): string {
  if (booking.status === "held") return "Ticket, waiting for online payment";
  if (booking.source === "ticket") return "Ticket";
  return booking.entitlement?.name ?? "—";
}

function BookingActions({ booking }: { booking: Schemas["Booking"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const attend = useAction(sendAttend);
  const cancel = useAction(sendCancelBooking);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [returnUse, setReturnUse] = useState(booking.source === "entitlement");
  const [reasonError, setReasonError] = useState<string | undefined>();

  if (!can("bookings:manage") || booking.status === "cancelled" || booking.status === "expired" || booking.status === "held") return null;

  async function markPresent() {
    const result = await attend.run({ slug: organization.slug, id: booking.id });
    if (result.ok) {
      toast.show({ tone: "success", title: "Marked present", body: booking.member.name });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "Not marked present", body: failureMessage(result.error) });
    }
  }

  async function cancelNow() {
    if (!reason.trim()) {
      setReasonError("Enter why the booking is cancelled.");
      return;
    }
    const result = await cancel.run({ slug: organization.slug, id: booking.id, reason: reason.trim(), return_use: returnUse });
    if (result.ok) {
      setCancelling(false);
      toast.show({
        tone: "success",
        title: "Booking cancelled",
        body: returnUse ? `${booking.member.name} got the use back.` : `${booking.member.name}'s use was kept.`,
      });
      void router.invalidate();
    }
  }

  return (
    <span className="roster-page__actions">
      {booking.status === "confirmed" ? (
        <Button type="button" size="sm" variant="secondary" disabled={attend.pending} onClick={() => void markPresent()}>
          <Check aria-hidden="true" />
          Present<span className="visually-hidden">: {booking.member.name}</span>
        </Button>
      ) : null}
      {booking.status === "confirmed" ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setCancelling(true)}>
          <X aria-hidden="true" />
          Cancel<span className="visually-hidden"> {booking.member.name}'s booking</span>
        </Button>
      ) : null}
      <ConfirmDialog
        open={cancelling}
        tone="critical"
        title={`Cancel ${booking.member.name}'s booking?`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        pendingLabel="Cancelling…"
        pending={cancel.pending}
        onConfirm={() => void cancelNow()}
        onCancel={() => setCancelling(false)}
      >
        <p>The spot opens for someone else.{booking.source === "ticket" ? " Refund the ticket from its sale if needed." : ""}</p>
        {cancel.error ? <p className="field__error">{failureMessage(cancel.error)}</p> : null}
        <Field id={`cancel-reason-${booking.id}`} label="Reason" error={reasonError}>
          <Textarea
            id={`cancel-reason-${booking.id}`}
            rows={2}
            maxLength={500}
            value={reason}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={describedBy(`cancel-reason-${booking.id}`, undefined, reasonError)}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {booking.source === "entitlement" ? (
          <label className="roster-page__check">
            <Checkbox checked={returnUse} onCheckedChange={(value) => setReturnUse(value === true)} />
            Give the use back to {booking.entitlement?.name ?? "the pass"}
          </label>
        ) : null}
      </ConfirmDialog>
    </span>
  );
}

function CancelTimeDialog({ roster, open, onClose }: { roster: Schemas["Roster"]; open: boolean; onClose: () => void }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendCancelTime);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function confirm() {
    if (!reason.trim()) {
      setError("Enter why this time is cancelled. Staff see it on the roster.");
      return;
    }
    const result = await action.run({ slug: organization.slug, id: roster.id, reason: reason.trim() });
    if (result.ok) {
      onClose();
      toast.show({ tone: "success", title: "Time cancelled", body: `${roster.spots_taken} bookings were cancelled and their uses returned.` });
      void router.invalidate();
    }
  }

  return (
    <ConfirmDialog
      open={open}
      tone="critical"
      title="Cancel this time?"
      confirmLabel="Cancel time"
      cancelLabel="Keep it"
      pendingLabel="Cancelling…"
      pending={action.pending}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      <p>
        {roster.spots_taken
          ? `${roster.spots_taken} bookings are cancelled and each pass or membership gets its use back. Ticket payments stay; refund them from each sale.`
          : "Nobody is booked yet."}
      </p>
      {action.error ? <p className="field__error">{failureMessage(action.error)}</p> : null}
      <Field id="time-cancel-reason" label="Reason" error={error}>
        <Textarea
          id="time-cancel-reason"
          rows={2}
          maxLength={500}
          value={reason}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy("time-cancel-reason", undefined, error)}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
}

/** Book a member with a right they hold, or sell them a ticket for this time. */
function BookMember({ roster, members }: { roster: Schemas["Roster"]; members: Schemas["Member"][] }) {
  const organization = useOrganization();
  const desk = useDeskLocation();
  const can = useCan();
  const router = useRouter();
  const navigate = useNavigate();
  const toast = useToast();
  const options = useAction(loadOptions);
  const booking = useAction(sendBooking);
  const sale = useAction(sendSale);
  const [saleKey, renewSaleKey] = useIdempotencyKey();
  const [memberId, setMemberId] = useState<string | null>(null);

  async function choose(id: string | null) {
    setMemberId(id);
    booking.reset();
    sale.reset();
    options.reset();
    if (id) await options.run({ slug: organization.slug, id: roster.id, memberId: id });
  }

  async function book(right: Schemas["Entitlement"]) {
    if (!memberId) return;
    const result = await booking.run({ slug: organization.slug, occurrence_id: roster.id, member_id: memberId, entitlement_id: right.id });
    if (result.ok) {
      const name = members.find((member) => member.id === memberId)?.name ?? "The member";
      toast.show({ tone: "success", title: "Booked", body: `${name} is booked with ${right.name}.` });
      setMemberId(null);
      options.reset();
      void router.invalidate();
    }
  }

  async function sell(price: Schemas["Price"]) {
    if (!memberId || !desk) return;
    const result = await sale.run({
      slug: organization.slug,
      idempotencyKey: saleKey,
      member_id: memberId,
      price_id: price.id,
      location_id: desk.id,
      occurrence_id: roster.id,
    });
    if (result.ok) {
      renewSaleKey();
      toast.show({ tone: "success", title: "Ticket sale recorded", body: "Take payment, then deliver it to book the spot." });
      void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: result.data.id } });
    }
  }

  const loaded = options.data;
  const full = roster.spots_left === 0;
  return (
    <Plate title="Book a member" icon={<UserPlus />} description={full ? "This time is full." : undefined}>
      <div className="form">
        <Combobox
          id="roster-member"
          label="Member"
          options={members.map((member) => ({ value: member.id, label: member.name, detail: member.email }))}
          value={memberId}
          onChange={(id) => void choose(id)}
          placeholder="Search by name or email"
        />
        {options.pending ? <SkeletonRows rows={2} /> : null}
        {options.error ? <FailureNotice error={options.error} title="Their passes did not load" /> : null}
        {loaded?.booking ? (
          <Notice tone="info" title="Already booked">
            <p>
              {loaded.member.name} has a spot here: {BOOKING_STATUS_LABEL[loaded.booking.status].toLowerCase()}.
            </p>
          </Notice>
        ) : loaded ? (
          <>
            {booking.error ? <FailureNotice error={booking.error} title="Not booked" /> : null}
            {sale.error ? <FailureNotice error={sale.error} title="The ticket sale was not recorded" /> : null}
            {can("bookings:create") ? (
              loaded.rights.length ? (
                <ul className="roster-page__options" aria-label="Book with a pass or membership">
                  {loaded.rights.map((right) => (
                    <li key={right.id}>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={full || booking.pending}
                        onClick={() => void book(right)}
                      >
                        Book with {right.name}
                      </Button>
                      <span className="cell-sub">
                        {right.remaining === null ? "Unlimited" : `${right.remaining} left`} · until{" "}
                        {formatDate(right.ends_at, organization.timezone)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">{loaded.member.name} has no pass or membership that covers this time.</p>
              )
            ) : null}
            {can("purchases:create") && loaded.ticket_prices.length ? (
              <ul className="roster-page__options" aria-label="Sell a ticket">
                {loaded.ticket_prices.map((price) => (
                  <li key={price.id}>
                    <Button type="button" disabled={full || sale.pending || !desk} onClick={() => void sell(price)}>
                      <Ticket aria-hidden="true" />
                      Sell {price.label}, {formatMoney(price.amount_minor, price.currency)}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="field__hint">Choose a member to see their passes and the ticket prices.</p>
        )}
      </div>
    </Plate>
  );
}
