import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import type { Schemas } from "@flowfokus/api";
import { PageActions } from "../../components/PageActions";
import { useCheckIn } from "../check-ins/CheckInFlow";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { Kbd, initials } from "../../components/ui";
import {
  BOOKING_STATUS_LABEL,
  failureMessage,
  formatDate,
  formatDuration,
  formatMoney,
  formatTime,
  formatWhen,
} from "../../lib/format";
import { useAction, useIdempotencyKey } from "../../lib/hooks";
import { useCan, useDeskLocation, useLocationName, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { useShortDate } from "./dates";
import type { MemberRecord } from "../../lib/staff.functions";
import { createLinkCode, renewMembership, unlinkMember } from "../../lib/staff.functions";
import {
  balanceDue,
  formatSpan,
  holdRows,
  isUpcoming,
  memberActivity,
  saleMarks,
  totalPaid,
  visibleHolds,
  type HoldRow,
  type SaleMark,
} from "./facts";
import { Horizon } from "./Horizon";
import { Empty, Section } from "./Section";
import { horizonFor } from "./timeline";
import { paymentFact, paymentMethods } from "../sales/facts";
import { METHOD_ICON } from "../sales/SaleFacts";
import { ActivityFeed, type FeedItem } from "@/components/parts/Activity";
import { DetailHero, DetailLayout, HeroTile, PanelGroup, PanelRow, PanelRows } from "@/components/parts/DetailLayout";
import {
  CellStack,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { CreditRing, StatusMark, TimeMark } from "@/components/parts/marks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sendLinkCode = (input: Parameters<typeof createLinkCode>[0]["data"]) => createLinkCode({ data: input });
const sendUnlink = (input: Parameters<typeof unlinkMember>[0]["data"]) => unlinkMember({ data: input });
const sendRenewal = (input: Parameters<typeof renewMembership>[0]["data"]) => renewMembership({ data: input });

const icon = { "aria-hidden": true, focusable: false } as const;

/** Lists show this many rows until staff choose View all. */
const RECENT = 5;
/** Rails returns at most this many sales per request (Staff::SalesController). A full list may be missing older sales. */
const SALES_LIMIT = 100;

/**
 * One page per member (Paper "Member details"): the hero, the Horizon, Holds,
 * Recent sales, Bookings, and Activity on the left; Contact on the right. Check
 * in (C) and Sell (S) are in the top bar; the other actions are in its more menu.
 * It shows only what Rails returns: no tags, phone, home location, notes,
 * comments, or spent total yet (issue #17).
 */
export function MemberDetails({ record }: { record: MemberRecord }) {
  const { member, sales } = record;
  const now = Date.now();
  return (
    <DetailLayout record="member" className="member-details" panel={<Contact member={member} />}>
      <MemberHero record={record} />
      <MemberActions record={record} />
      <HorizonSection member={member} sales={sales} now={now} />
      <Holds member={member} sales={sales} now={now} />
      <RecentSales sales={sales} memberId={member.id} />
      <Bookings bookings={member.bookings} now={now} />
      <Activity record={record} />
    </DetailLayout>
  );
}

/* ---------- Hero ---------- */

/** "Nov 2026", in the organization's time zone. */
function useMonthYear() {
  const { timezone } = useOrganization();
  return (iso: string) => new Intl.DateTimeFormat("en-MY", { timeZone: timezone, month: "short", year: "numeric" }).format(new Date(iso));
}

/**
 * The tile, the name, "Member since Nov 2026", and two stats from the member's
 * sales: what they paid (less refunds) and what is still due. Rails has no
 * spent total, so with 100 sales, the most it returns, the stats stay out.
 */
function MemberHero({ record }: { record: MemberRecord }) {
  const { member, sales } = record;
  const organization = useOrganization();
  const monthYear = useMonthYear();
  const paid = totalPaid(sales);
  const due = balanceDue(sales);
  const zero = formatMoney(0, organization.currency);
  return (
    <DetailHero
      tile={<HeroTile initials={initials(member.name)} />}
      title={member.name}
      line={
        <>
          Member since{" "}
          <time dateTime={member.created_at} suppressHydrationWarning>
            {monthYear(member.created_at)}
          </time>
        </>
      }
      stats={
        sales.length >= SALES_LIMIT
          ? undefined
          : [
              { value: paid.length ? paid.join(" + ") : zero, label: "paid" },
              { value: due.length ? due.join(" + ") : zero, label: "balance due" },
            ]
      }
    />
  );
}

/* ---------- Top bar actions ---------- */

/**
 * Check in (C, needs check_ins:create), Sell (S, needs purchases:create), and
 * the more menu: Renew (purchases:create, when Rails offers renewal terms) and
 * the gym site sign-in (members:link). Rails checks every request again.
 */
function MemberActions({ record }: { record: MemberRecord }) {
  const { member } = record;
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const router = useRouter();
  const toast = useToast();
  const [renewing, setRenewing] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [code, setCode] = useState<Schemas["MemberLinkCode"] | null>(null);
  const issue = useAction(sendLinkCode);
  const unlink = useAction(sendUnlink);
  // C checks the member in at the top bar location: a toast, or the denial dialog.
  const flow = useCheckIn({ record });
  const canCheckIn = can("check_ins:create");
  const canSell = can("purchases:create");
  const canRenew = member.renewal !== null && canSell;
  const canLink = can("members:link");
  const linked = member.linked_email;
  const checkIn = () => {
    if (!flow.pending) void flow.checkIn(member);
  };
  const sell = () =>
    void navigate({ to: "/$org/sales/new", params: { org: organization.slug }, search: { member: member.id } });
  useShortcut("c", checkIn, { enabled: canCheckIn });
  useShortcut("s", sell, { enabled: canSell });

  async function createCode() {
    const result = await issue.run({ slug: organization.slug, id: member.id });
    if (result.ok) setCode(result.data);
    else toast.show({ tone: "error", title: "No code was created", body: failureMessage(result.error) });
  }

  return (
    <>
      <PageActions>
        {canCheckIn ? (
          <Button
            type="button"
            variant="secondary"
            size="compact"
            aria-keyshortcuts="C"
            disabled={flow.pending}
            aria-busy={flow.pending || undefined}
            onClick={checkIn}
          >
            {flow.pending ? "Checking in…" : "Check in"}
            <Kbd>C</Kbd>
          </Button>
        ) : null}
        {canSell ? (
          <Link
            to="/$org/sales/new"
            params={{ org: organization.slug }}
            search={{ member: member.id }}
            className={buttonVariants({ size: "compact" })}
            aria-keyshortcuts="S"
          >
            Sell
            <Kbd>S</Kbd>
          </Link>
        ) : null}
        {canRenew || canLink ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="button button--ghost button--icon button--compact" aria-label="More actions">
              <Icon name="more" {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canRenew ? (
                <DropdownMenuItem onClick={() => setRenewing(true)}>
                  <Icon name="sort" {...icon} />
                  Renew membership…
                </DropdownMenuItem>
              ) : null}
              {canLink && linked ? (
                <DropdownMenuItem onClick={() => setUnlinking(true)}>
                  <Icon name="profile" {...icon} />
                  Unlink sign-in…
                </DropdownMenuItem>
              ) : null}
              {canLink && !linked ? (
                <DropdownMenuItem disabled={issue.pending} onClick={() => void createCode()}>
                  <Icon name="profile" {...icon} />
                  Create link code
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </PageActions>
      {flow.dialog}
      {member.renewal && canRenew ? (
        <RenewDialog member={member} renewal={member.renewal} open={renewing} onClose={() => setRenewing(false)} />
      ) : null}
      {code && !linked ? <LinkCodeDialog member={member} code={code} onClose={() => setCode(null)} /> : null}
      <ConfirmDialog
        open={unlinking}
        tone="critical"
        title={`Unlink ${member.name}'s sign-in?`}
        confirmLabel="Unlink"
        pendingLabel="Unlinking…"
        pending={unlink.pending}
        onConfirm={async () => {
          const result = await unlink.run({ slug: organization.slug, id: member.id });
          setUnlinking(false);
          if (result.ok) {
            toast.show({ tone: "success", title: "Sign-in unlinked", body: "The member record and its history stay." });
            void router.invalidate();
          } else {
            toast.show({ tone: "error", title: "The sign-in was not unlinked", body: failureMessage(result.error) });
          }
        }}
        onCancel={() => setUnlinking(false)}
      >
        <p>They can no longer see this membership on the gym site until they link again with a new code.</p>
      </ConfirmDialog>
    </>
  );
}

/** Rails shows a link code once. This dialog keeps it on screen until staff close it. */
function LinkCodeDialog({ member, code, onClose }: { member: Schemas["MemberDetail"]; code: Schemas["MemberLinkCode"]; onClose: () => void }) {
  const organization = useOrganization();
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent>
        <DialogBody>
          <DialogTitle>Link code for {member.name}</DialogTitle>
          <DialogDescription>
            <p role="status">
              Give {member.name} this code: <strong className="link-code">{code.code}</strong>. It works once, until{" "}
              {formatDate(code.expires_at, organization.timezone)}. They enter it after signing in on the gym site.
            </p>
          </DialogDescription>
        </DialogBody>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Sells another period at the member's agreed price. Rails copies the terms of
 * the latest fulfilled sale, never the current catalog price.
 */
export function RenewDialog({
  member,
  renewal,
  open,
  onClose,
}: {
  member: Schemas["MemberDetail"];
  renewal: Schemas["RenewalTerms"];
  open: boolean;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const location = useDeskLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const action = useAction(sendRenewal);
  const [key, renewKey] = useIdempotencyKey();
  const price = formatMoney(renewal.amount_minor, renewal.currency);

  async function renew() {
    if (!location) return;
    const result = await action.run({ slug: organization.slug, idempotencyKey: key, memberId: member.id, location_id: location.id });
    if (result.ok) {
      renewKey();
      onClose();
      toast.show({ tone: "success", title: "Renewal recorded", body: "Record payment, then fulfill the sale to start the new period." });
      void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: result.data.id } });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={`Renew ${member.name} for ${price}?`}
      confirmLabel={`Renew for ${price}`}
      pendingLabel="Recording…"
      pending={action.pending}
      onConfirm={() => void renew()}
      onCancel={() => {
        action.reset();
        onClose();
      }}
    >
      <p>
        {renewal.product_name}, {renewal.price_label}: {formatDuration(renewal.duration_days)} at the agreed price. If
        fulfilled now, the new period starts {formatDate(renewal.starts_at, organization.timezone)}.
      </p>
      <p>{location ? `Sold at ${location.name}.` : "Add a location before you renew."}</p>
      {action.error ? <p role="alert">{failureMessage(action.error)}</p> : null}
    </ConfirmDialog>
  );
}

/* ---------- Sections ---------- */

const HOLD_COLUMNS: ListColumn[] = [
  { id: "hold", label: "Hold" },
  { id: "status", label: "Status", width: "200px", align: "end" },
];

/** The Horizon, when the member has a booking, a period, or a pass in its window. */
function HorizonSection({ member, sales, now }: { member: Schemas["MemberDetail"]; sales: Schemas["Sale"][]; now: number }) {
  const productName = (saleId: string) => sales.find((sale) => sale.id === saleId)?.line_item.product_name ?? "Membership period";
  const horizon = horizonFor(member, productName, now);
  // Today alone says nothing.
  if (horizon.events.length < 2) return null;
  return <Horizon horizon={horizon} />;
}

function HoldStatusMark({ status }: { status: HoldRow["status"] }) {
  if (status.kind === "credit") return <CreditRing left={status.left} total={status.total} />;
  if (status.kind === "time") {
    return (
      <TimeMark fraction={status.fraction} tone={status.tone}>
        <span suppressHydrationWarning>{status.text}</span>
      </TimeMark>
    );
  }
  return <span className="cell-muted">{status.text}</span>;
}

/** One row per membership period and access right, with Rails dates and counts. */
function Holds({ member, sales, now }: { member: Schemas["MemberDetail"]; sales: Schemas["Sale"][]; now: number }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const shortDate = useShortDate();
  const [all, setAll] = useState(false);
  const rows = holdRows(member, sales, now, shortDate, locationName);
  const shown = all ? rows : visibleHolds(rows);
  return (
    <Section id="holds" title="Holds" more={rows.length > shown.length || all ? { open: all, onToggle: () => setAll(!all) } : null}>
      {rows.length ? (
        <ListTable label="Holds" density="two-line" className="list-table--bare" columns={HOLD_COLUMNS}>
          <ListTableBody>
            {shown.map((row) => (
              <ListTableRow key={row.id}>
                <ListTableCell>
                  <CellStack
                    title={
                      row.saleId ? (
                        <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: row.saleId }} className="list-table__link">
                          {row.title}
                        </Link>
                      ) : (
                        row.title
                      )
                    }
                    sub={<span suppressHydrationWarning>{row.sub}</span>}
                  />
                </ListTableCell>
                <ListTableCell align="end" className="member-status">
                  <HoldStatusMark status={row.status} />
                </ListTableCell>
              </ListTableRow>
            ))}
          </ListTableBody>
        </ListTable>
      ) : (
        <Empty>No membership or pass yet. The first fulfilled sale of one starts it.</Empty>
      )}
    </Section>
  );
}

const SALE_COLUMNS: ListColumn[] = [
  { id: "sale", label: "Sale" },
  { id: "payment", label: "Payment", width: "104px" },
  { id: "fulfillment", label: "Fulfillment", width: "120px" },
  { id: "method", label: "Method", width: "120px" },
  { id: "amount", label: "Amount", width: "104px", align: "end" },
];

function MarkOf({ mark }: { mark: SaleMark }) {
  return (
    <StatusMark kind={mark.kind} tone={mark.tone}>
      {mark.label}
    </StatusMark>
  );
}

/** The latest sales: product and date, payment and fulfillment as separate marks, method, amount. */
function RecentSales({ sales, memberId }: { sales: Schemas["Sale"][]; memberId: string }) {
  const organization = useOrganization();
  const can = useCan();
  const shortDate = useShortDate();
  const [all, setAll] = useState(false);
  const shown = all ? sales : sales.slice(0, RECENT);
  return (
    <Section id="sales" title="Recent sales" more={sales.length > RECENT ? { open: all, onToggle: () => setAll(!all) } : null}>
      {sales.length ? (
        <ListTable label="Recent sales" density="two-line" className="list-table--bare member-sales" columns={SALE_COLUMNS}>
          <ListTableBody>
            {shown.map((sale) => {
              const marks = saleMarks(sale);
              const methods = paymentMethods(sale);
              const methodIcon = sale.payments[0] ? METHOD_ICON[sale.payments[0].method] : null;
              const payment = paymentFact(sale);
              return (
                <ListTableRow key={sale.id}>
                  <ListTableCell>
                    <CellStack
                      title={
                        <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: sale.id }} className="list-table__link">
                          {sale.line_item.product_name}
                        </Link>
                      }
                      sub={<span suppressHydrationWarning>Sold {shortDate(sale.purchased_at)}</span>}
                    />
                  </ListTableCell>
                  <ListTableCell className="member-sales__payment">
                    <MarkOf mark={marks.payment} />
                  </ListTableCell>
                  <ListTableCell className="member-sales__fulfillment">
                    <MarkOf mark={marks.fulfillment} />
                  </ListTableCell>
                  <ListTableCell className="cell-muted member-sales__method">
                    <span className="member-method">
                      {methodIcon ? <Icon name={methodIcon} size={14} {...icon} /> : null}
                      {methods ?? "—"}
                    </span>
                  </ListTableCell>
                  <ListTableCell align="end" className="member-sales__amount">
                    <span className="member-amount">
                      <span className="cell-figure">{formatMoney(sale.total_minor, sale.currency)}</span>
                      {!sale.voided_at && sale.balance_minor > 0 ? (
                        <span className="member-amount__note" data-state={payment.state}>
                          {formatMoney(sale.balance_minor, sale.currency)} due
                        </span>
                      ) : sale.refunded_minor > 0 ? (
                        <span className="member-amount__note">{formatMoney(sale.refunded_minor, sale.currency)} refunded</span>
                      ) : null}
                    </span>
                  </ListTableCell>
                </ListTableRow>
              );
            })}
          </ListTableBody>
        </ListTable>
      ) : (
        <Empty>
          No sales yet.
          {can("purchases:create") ? (
            <>
              {" "}
              <Link to="/$org/sales/new" params={{ org: organization.slug }} search={{ member: memberId }}>
                Sell a membership or pass
              </Link>
              .
            </>
          ) : null}
        </Empty>
      )}
    </Section>
  );
}

const BOOKING_COLUMNS: ListColumn[] = [
  { id: "booking", label: "Booking" },
  { id: "right", label: "Right used", width: "240px" },
  { id: "when", label: "When", width: "104px", align: "end" },
];

/** "Thu 5 Nov, 7:00 am – 8:00 am", in the organization's time zone. */
function useBookingTime() {
  const { timezone } = useOrganization();
  const day = new Intl.DateTimeFormat("en-MY", { timeZone: timezone, weekday: "short", day: "numeric", month: "short" });
  return (booking: Schemas["Booking"]) =>
    `${day.format(new Date(booking.starts_at))}, ${formatTime(booking.starts_at, timezone)} – ${formatTime(booking.ends_at, timezone)}`;
}

function Bookings({ bookings, now }: { bookings: Schemas["Booking"][]; now: number }) {
  const organization = useOrganization();
  const bookingTime = useBookingTime();
  const [all, setAll] = useState(false);
  const upcoming = bookings.filter((booking) => isUpcoming(booking, now));
  const earlier = bookings.filter((booking) => !isUpcoming(booking, now));
  const initial = upcoming.length ? upcoming.slice(0, RECENT) : earlier.slice(0, 3);
  const shown = all ? bookings : initial;
  return (
    <Section id="bookings" title="Bookings" more={bookings.length > initial.length ? { open: all, onToggle: () => setAll(!all) } : null}>
      {bookings.length ? (
        <ListTable label="Bookings" density="two-line" className="list-table--bare member-bookings" columns={BOOKING_COLUMNS}>
          <ListTableBody>
            {shown.map((booking) => (
              <ListTableRow key={booking.id}>
                <ListTableCell>
                  <CellStack
                    title={
                      <Link
                        to="/$org/schedule/$occurrenceId"
                        params={{ org: organization.slug, occurrenceId: booking.occurrence_id }}
                        className="list-table__link"
                      >
                        {booking.program.name}
                      </Link>
                    }
                    sub={
                      <time dateTime={booking.starts_at} suppressHydrationWarning>
                        {bookingTime(booking)}
                      </time>
                    }
                  />
                </ListTableCell>
                <ListTableCell className="cell-muted member-bookings__right">
                  <span className="member-bookings__text">
                    {booking.source === "ticket" ? "Ticket" : booking.entitlement ? `Uses ${booking.entitlement.name}` : "Held for payment"}
                  </span>
                </ListTableCell>
                <ListTableCell align="end" className="cell-figure member-bookings__when">
                  <span suppressHydrationWarning>
                    {isUpcoming(booking, now) ? `In ${formatSpan(Date.parse(booking.starts_at) - now)}` : BOOKING_STATUS_LABEL[booking.status]}
                  </span>
                </ListTableCell>
              </ListTableRow>
            ))}
          </ListTableBody>
        </ListTable>
      ) : (
        <Empty>
          No bookings yet. Book from a session on the{" "}
          <Link to="/$org/schedule" params={{ org: organization.slug }}>
            schedule
          </Link>
          .
        </Empty>
      )}
    </Section>
  );
}

/** Check-ins, sales, payments, fulfillments, refunds, voids, bookings, and the join date. No comment box: Rails has no comments. */
function Activity({ record }: { record: MemberRecord }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const items = memberActivity(record, locationName).map(
    (event): FeedItem => ({ kind: "event", id: event.id, tone: event.tone, time: formatWhen(event.at, organization.timezone), children: event.text }),
  );
  return <ActivityFeed items={items} visible={RECENT} />;
}

/* ---------- Contact ---------- */

/** The right panel: the email and the gym site link state. Rails has no phone, emergency contact, tags, home location, or notes yet. */
function Contact({ member }: { member: Schemas["MemberDetail"] }) {
  const linked = member.linked_email;
  return (
    <PanelGroup title="Contact">
      <PanelRows>
        <PanelRow label="Email">
          <a className="panel-link" href={`mailto:${member.email}`}>
            {member.email}
          </a>
        </PanelRow>
        <PanelRow label="Gym site">{linked ? `Linked · ${linked}` : "Not linked"}</PanelRow>
      </PanelRows>
    </PanelGroup>
  );
}

/* ---------- Loading ---------- */

/** Keeps the page shape while the member loads, so nothing jumps. */
export function MemberDetailsLoading() {
  return (
    <DetailLayout record="member" className="member-details">
      <div role="status" aria-busy="true" aria-label="Loading member" className="member-loading">
        <header className="hero">
          <span className="tile tile--hero skeleton" />
          <div className="hero__text">
            <span className="skeleton member-loading__title" />
            <span className="skeleton member-loading__line" />
          </div>
        </header>
        {["Holds", "Recent sales"].map((title) => (
          <section key={title} className="member-section">
            <div className="member-section__head">
              <h2>{title}</h2>
            </div>
            <ListTable label={`${title} (loading)`} density="two-line" className="list-table--bare" columns={HOLD_COLUMNS}>
              <ListTableLoading rows={2} label={`Loading ${title.toLowerCase()}`} />
            </ListTable>
          </section>
        ))}
      </div>
    </DetailLayout>
  );
}
