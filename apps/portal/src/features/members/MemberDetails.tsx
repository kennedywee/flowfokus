import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  IdCard,
  Mail,
  MoreHorizontal,
  Receipt,
  RefreshCw,
  Ticket,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Schemas } from "@flowfokus/api";
import { PageActions } from "../../components/PageActions";
import { useCheckIn } from "../check-ins/CheckInFlow";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { Kbd, initials } from "../../components/ui";
import {
  BOOKING_STATUS_LABEL,
  failureMessage,
  formatBenefitUsage,
  formatDate,
  formatDuration,
  formatMoney,
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
  isUpcoming,
  memberActivity,
  orderPeriods,
  periodState,
  periodText,
  totalPaid,
  type ActivityEvent,
  type PeriodState,
} from "./facts";
import { paymentFact, paymentMethods } from "../sales/facts";
import { FulfillmentMark, METHOD_ICON, PaymentMark } from "../sales/SaleFacts";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sendLinkCode = (input: Parameters<typeof createLinkCode>[0]["data"]) => createLinkCode({ data: input });
const sendUnlink = (input: Parameters<typeof unlinkMember>[0]["data"]) => unlinkMember({ data: input });
const sendRenewal = (input: Parameters<typeof renewMembership>[0]["data"]) => renewMembership({ data: input });

const icon = { strokeWidth: 1.5, "aria-hidden": true, focusable: false } as const;
const statusIcon = { strokeWidth: 1.75, "aria-hidden": true, focusable: false } as const;

/** Lists show this many rows until staff ask for the rest. */
const RECENT = 5;

/**
 * One page per member: membership, access, bookings, sales, and activity on
 * the left; the member's properties on the right. Check in and Sell start here.
 */
export function MemberDetails({ record }: { record: MemberRecord }) {
  const { member, sales, checkIns } = record;
  const now = Date.now();
  return (
    <div className="page member-page member-details">
      <MemberHeader record={record} />
      <div className="member-details__membership">
        <MembershipSection member={member} sales={sales} now={now} />
      </div>
      <Properties record={record} />
      <div className="member-details__rest">
        <AccessSection member={member} />
        <BookingsSection bookings={member.bookings} now={now} />
        <SalesSection sales={sales} memberId={member.id} />
        <ActivitySection record={{ member, sales, checkIns }} />
      </div>
    </div>
  );
}

/* ---------- Header and actions ---------- */

function MemberHeader({ record }: { record: MemberRecord }) {
  const { member, sales, checkIns } = record;
  const organization = useOrganization();
  const can = useCan();
  const navigate = useNavigate();
  const [renewing, setRenewing] = useState(false);
  // C checks the member in at the top bar location: a toast, or the denial dialog.
  const flow = useCheckIn({ record });
  const canCheckIn = can("check_ins:create");
  const checkIn = () => {
    if (!flow.pending) void flow.checkIn(member);
  };
  const due = balanceDue(sales);
  const lastVisit = checkIns.find((checkIn) => checkIn.result === "granted");
  const canRenew = member.renewal !== null && can("purchases:create");

  const sell = () =>
    void navigate({ to: "/$org/sales/new", params: { org: organization.slug }, search: { member: member.id } });
  useShortcut("c", checkIn, { enabled: canCheckIn });
  useShortcut("s", sell);

  return (
    <header className="member-head">
      <span className="member-head__avatar" aria-hidden="true">
        {initials(member.name)}
      </span>
      <div className="member-head__text">
        <h1>{member.name}</h1>
        <p className="member-head__meta">
          {lastVisit ? (
            <>
              Last visit{" "}
              <time dateTime={lastVisit.checked_in_at} suppressHydrationWarning>
                {formatWhen(lastVisit.checked_in_at, organization.timezone)}
              </time>
            </>
          ) : (
            "No visits yet"
          )}
          {" · "}
          {due.length ? <span className="member-head__due">{due.join(" + ")} due</span> : "No balance due"}
        </p>
      </div>
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
        <Link
          to="/$org/sales/new"
          params={{ org: organization.slug }}
          search={{ member: member.id }}
          className={buttonVariants({ variant: "secondary", size: "compact" })}
          aria-keyshortcuts="S"
        >
          Sell
          <Kbd>S</Kbd>
        </Link>
        {canRenew ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="button button--ghost button--icon button--compact" aria-label="More actions">
              <MoreHorizontal {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenewing(true)}>
                <RefreshCw {...statusIcon} />
                Renew membership…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </PageActions>
      {flow.dialog}
      {member.renewal && canRenew ? (
        <RenewDialog member={member} renewal={member.renewal} open={renewing} onClose={() => setRenewing(false)} />
      ) : null}
    </header>
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

/** A list section: a grey band with an icon, a title, and a count, then rows. */
function Section({
  id,
  title,
  icon: Icon,
  count,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  count?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-section" aria-labelledby={`${id}-title`}>
      <div className="mx-section__head">
        <Icon {...icon} />
        <h2 id={`${id}-title`}>{title}</h2>
        {count ? <span className="mx-section__count">{count}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** "Show all 11 sales" under a list. It shows the rest in place. */
function ShowMore({ shown, total, noun, expanded, onToggle }: { shown: number; total: number; noun: string; expanded: boolean; onToggle: () => void }) {
  if (total <= shown && !expanded) return null;
  return (
    <button type="button" className="mx-more" aria-expanded={expanded} onClick={onToggle}>
      {expanded ? "Show fewer" : `Show all ${total} ${noun}`}
      <ChevronDown className="mx-more__icon" {...icon} />
    </button>
  );
}

/** A 16px ring that fills with the share of the period left. Colour marks the state; the text says it. */
function PeriodMark({ state, left }: { state: PeriodState; left: number }) {
  const r = 4.5;
  const angle = Math.min(Math.max(left, 0), 0.9999) * 2 * Math.PI;
  const x = 8 + r * Math.sin(angle);
  const y = 8 - r * Math.cos(angle);
  const large = angle > Math.PI ? 1 : 0;
  return (
    <svg className="period-mark" data-state={state} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={state === "upcoming" ? "2.2 2" : undefined} />
      {state === "current" && left > 0 ? <path d={`M8 8 L8 3.5 A${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`} fill="currentColor" /> : null}
      {state === "revoked" ? <path d="M4.5 11.5 11.5 4.5" stroke="currentColor" strokeWidth="1.5" /> : null}
    </svg>
  );
}

function MembershipSection({ member, sales, now }: { member: Schemas["MemberDetail"]; sales: Schemas["Sale"][]; now: number }) {
  const organization = useOrganization();
  const shortDate = useShortDate();
  const [all, setAll] = useState(false);
  const periods = member.membership?.periods ?? [];
  const { active, rest } = orderPeriods(periods, now);
  // Show what covers now or starts later. With none, show the latest period.
  const shown = all ? [...active, ...rest] : active.length ? active : rest.slice(0, 1);
  const productName = (saleId: string) => sales.find((sale) => sale.id === saleId)?.line_item.product_name ?? "Membership period";

  return (
    <Section id="membership" title="Membership" icon={IdCard} count={periods.length ? `${active.length} active of ${periods.length}` : undefined}>
      {periods.length ? (
        <>
          <ul className="mx-rows">
            {shown.map((period) => {
              const { state, left } = periodState(period, now);
              return (
                <li key={period.id} className="mx-row mx-row--tall">
                  <div className="mx-row__main">
                    <Link className="mx-row__title" to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: period.sale_id }}>
                      {productName(period.sale_id)}
                    </Link>
                    <span className="mx-row__sub" suppressHydrationWarning>
                      {shortDate(period.starts_at)} – {shortDate(period.ends_at)}
                    </span>
                  </div>
                  <span className="mx-status" suppressHydrationWarning>
                    <PeriodMark state={state} left={left} />
                    {periodText(period, now, shortDate)}
                  </span>
                </li>
              );
            })}
          </ul>
          <ShowMore shown={shown.length} total={periods.length} noun="periods" expanded={all} onToggle={() => setAll(!all)} />
        </>
      ) : (
        <p className="mx-empty">No membership yet. The first fulfilled membership sale starts one.</p>
      )}
    </Section>
  );
}

/** Rights to enter or book, from fulfilled memberships and passes. Ticket rights show on their booking. */
function AccessSection({ member }: { member: Schemas["MemberDetail"] }) {
  const locationName = useLocationName();
  const shortDate = useShortDate();
  const rights = member.entitlements.filter((right) => right.occurrence_id === null);
  const active = rights.filter((right) => right.active).length;

  return (
    <Section id="access" title="Access" icon={Ticket} count={rights.length ? `${active} active of ${rights.length}` : undefined}>
      {rights.length ? (
        <ul className="mx-rows">
          {rights.map((right) => {
            const unit = right.kind === "gym_access" ? "visits" : "bookings";
            return (
              <li key={right.id} className="mx-row mx-row--tall">
                <div className="mx-row__main">
                  <span className="mx-row__title">{right.name}</span>
                  <span className="mx-row__sub" suppressHydrationWarning>
                    {shortDate(right.starts_at)} – {shortDate(right.ends_at)} · {locationName(right.location_id)}
                  </span>
                </div>
                {!right.active ? (
                  <span className="mx-status" suppressHydrationWarning>
                    <PeriodMark state="upcoming" left={1} />
                    Starts {shortDate(right.starts_at)}
                  </span>
                ) : right.usage_limit !== null && right.remaining !== null ? (
                  <span className="mx-usage" data-empty={right.remaining === 0 || undefined}>
                    <span
                      className="mx-usage__track"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={right.usage_limit}
                      aria-valuenow={right.remaining}
                      aria-label={`${right.name}: ${unit} left`}
                    >
                      <span
                        className="mx-usage__fill"
                        style={{ transform: `scaleX(${right.usage_limit ? right.remaining / right.usage_limit : 0})` }}
                      />
                    </span>
                    <span className="mx-usage__text">
                      {right.remaining} of {right.usage_limit} left
                    </span>
                  </span>
                ) : (
                  <span className="mx-usage__text">{formatBenefitUsage(right)}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mx-empty">No access rights. A fulfilled membership or pass adds them.</p>
      )}
    </Section>
  );
}

function BookingsSection({ bookings, now }: { bookings: Schemas["Booking"][]; now: number }) {
  const organization = useOrganization();
  const [all, setAll] = useState(false);
  const upcoming = bookings.filter((booking) => isUpcoming(booking, now));
  const earlier = bookings.filter((booking) => !isUpcoming(booking, now));
  const shown = all ? bookings : upcoming.length ? upcoming.slice(0, RECENT) : earlier.slice(0, 3);

  return (
    <Section id="bookings" title="Bookings" icon={CalendarDays} count={bookings.length ? `${upcoming.length} upcoming` : undefined}>
      {bookings.length ? (
        <>
          <ul className="mx-rows">
            {shown.map((booking) => (
              <li key={booking.id} className="mx-row mx-row--tall mx-booking">
                <div className="mx-row__main">
                  <Link
                    className="mx-row__title"
                    to="/$org/schedule/$occurrenceId"
                    params={{ org: organization.slug, occurrenceId: booking.occurrence_id }}
                  >
                    {booking.program.name}
                  </Link>
                  <time className="mx-row__sub" dateTime={booking.starts_at} suppressHydrationWarning>
                    {formatWhen(booking.starts_at, organization.timezone)}
                  </time>
                </div>
                <span className="mx-booking__right">
                  {booking.source === "ticket" ? "Ticket" : booking.entitlement ? `Uses ${booking.entitlement.name}` : "Held for payment"}
                </span>
                <span className="mx-booking__when" suppressHydrationWarning>
                  {isUpcoming(booking, now) ? `In ${formatSpan(Date.parse(booking.starts_at) - now)}` : BOOKING_STATUS_LABEL[booking.status]}
                </span>
              </li>
            ))}
          </ul>
          <ShowMore shown={shown.length} total={bookings.length} noun="bookings" expanded={all} onToggle={() => setAll(!all)} />
        </>
      ) : (
        <p className="mx-empty">
          No bookings yet. Book from a session on the{" "}
          <Link to="/$org/schedule" params={{ org: organization.slug }}>
            schedule
          </Link>
          .
        </p>
      )}
    </Section>
  );
}

function SalesSection({ sales, memberId }: { sales: Schemas["Sale"][]; memberId: string }) {
  const organization = useOrganization();
  const shortDate = useShortDate();
  const [all, setAll] = useState(false);
  const shown = all ? sales : sales.slice(0, RECENT);

  return (
    <Section
      id="sales"
      title="Sales"
      icon={Receipt}
      count={sales.length ? (sales.length > RECENT && !all ? `Recent ${RECENT} of ${sales.length}` : `${sales.length}`) : undefined}
    >
      {sales.length ? (
        <>
          <ul className="mx-rows mx-sales">
            {shown.map((sale) => {
              const methods = paymentMethods(sale);
              const MethodIcon = sale.payments[0] ? METHOD_ICON[sale.payments[0].method] : null;
              const payment = paymentFact(sale);
              return (
                <li key={sale.id}>
                  <Link className="mx-sale" to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: sale.id }}>
                    <span className="mx-row__main">
                      <span className="mx-row__title">{sale.line_item.product_name}</span>
                      <span className="mx-row__sub" suppressHydrationWarning>
                        Sold on {shortDate(sale.purchased_at)}
                      </span>
                    </span>
                    <PaymentMark sale={sale} className="mx-sale__payment" />
                    <FulfillmentMark sale={sale} className="mx-sale__fulfillment" />
                    <span className="mx-fact mx-sale__method">
                      {MethodIcon ? <MethodIcon {...statusIcon} /> : null}
                      {methods ?? "—"}
                    </span>
                    <span className="mx-sale__amount">
                      <span className="mx-sale__total">{formatMoney(sale.total_minor, sale.currency)}</span>
                      {!sale.voided_at && sale.balance_minor > 0 ? (
                        <span className="mx-sale__due" data-state={payment.state}>
                          {formatMoney(sale.balance_minor, sale.currency)} due
                        </span>
                      ) : sale.refunded_minor > 0 ? (
                        <span className="mx-sale__refunded">{formatMoney(sale.refunded_minor, sale.currency)} refunded</span>
                      ) : null}
                    </span>
                    <ChevronRight className="mx-sale__chevron" {...icon} />
                  </Link>
                </li>
              );
            })}
          </ul>
          <ShowMore shown={shown.length} total={sales.length} noun="sales" expanded={all} onToggle={() => setAll(!all)} />
        </>
      ) : (
        <p className="mx-empty">
          No sales yet.{" "}
          <Link to="/$org/sales/new" params={{ org: organization.slug }} search={{ member: memberId }}>
            Sell a membership or pass
          </Link>
          .
        </p>
      )}
    </Section>
  );
}

function ActivitySection({ record }: { record: MemberRecord }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const [all, setAll] = useState(false);
  const events = memberActivity(record, locationName);
  const shown: ActivityEvent[] = all ? events : events.slice(0, RECENT);
  const earlier = events.length - RECENT;

  return (
    <section className="mx-section mx-activity" aria-labelledby="activity-title">
      <div className="mx-activity__head">
        <Activity {...icon} />
        <h2 id="activity-title">Activity</h2>
      </div>
      <ol className="mx-feed">
        {shown.map((event) => (
          <li key={event.id} className="mx-feed__item">
            <span className="mx-feed__dot" data-tone={event.tone} aria-hidden="true" />
            <span className="mx-feed__text">{event.text}</span>
            <time className="mx-feed__when" dateTime={event.at} suppressHydrationWarning>
              {formatWhen(event.at, organization.timezone)}
            </time>
          </li>
        ))}
      </ol>
      {earlier > 0 ? (
        <button type="button" className="mx-more mx-more--center" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? "Show fewer events" : `Show ${earlier} earlier ${earlier === 1 ? "event" : "events"}`}
          <ChevronDown className="mx-more__icon" {...icon} />
        </button>
      ) : null}
    </section>
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

function Properties({ record }: { record: MemberRecord }) {
  const { member, sales } = record;
  const organization = useOrganization();
  const paid = totalPaid(sales);
  return (
    <aside className="mx-props" aria-label="Member properties">
      <section className="mx-props__group" aria-labelledby="props-contact">
        <h2 id="props-contact">Contact</h2>
        <dl>
          <Property label="Email">
            <span className="mx-value">
              <Mail {...statusIcon} />
              <a href={`mailto:${member.email}`}>{member.email}</a>
            </span>
          </Property>
          <Property label="Gym site">
            <SignInValue member={member} />
          </Property>
        </dl>
      </section>
      <section className="mx-props__group" aria-labelledby="props-lifetime">
        <h2 id="props-lifetime">Lifetime</h2>
        <dl>
          <Property label="Member since">
            <span className="mx-value">
              <time dateTime={member.created_at} suppressHydrationWarning>
                {formatDate(member.created_at, organization.timezone)}
              </time>
            </span>
          </Property>
          <Property label="Total paid">
            <span className="mx-value">{paid.length ? paid.join(" + ") : formatMoney(0, organization.currency)}</span>
          </Property>
        </dl>
      </section>
    </aside>
  );
}

/**
 * The member's link to a gym site sign-in. Staff with members:link click the
 * value to create a one-time code or to unlink. Rails shows the code once.
 */
function SignInValue({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const issue = useAction(sendLinkCode);
  const unlink = useAction(sendUnlink);
  const [code, setCode] = useState<Schemas["MemberLinkCode"] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const allowed = can("members:link");
  const linked = member.linked_email;
  const value = (
    <>
      {linked ? <UserCheck {...statusIcon} /> : <UserX {...statusIcon} />}
      <span className="mx-value__text">{linked ? `Linked · ${linked}` : "Not linked"}</span>
    </>
  );

  if (!allowed) return <span className="mx-value">{value}</span>;

  async function createCode() {
    const result = await issue.run({ slug: organization.slug, id: member.id });
    if (result.ok) setCode(result.data);
    else toast.show({ tone: "error", title: "No code was created", body: failureMessage(result.error) });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="mx-value mx-value--edit" aria-label={`Gym site sign-in: ${linked ? `linked to ${linked}` : "not linked"}. Change`}>
          {value}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {linked ? (
            <DropdownMenuItem onClick={() => setConfirming(true)}>
              <UserX {...statusIcon} />
              Unlink sign-in…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={issue.pending} onClick={() => void createCode()}>
              <UserCheck {...statusIcon} />
              Create link code
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {code && !linked ? (
        <p className="mx-code" role="status">
          Give {member.name} this code: <strong className="mx-code__value">{code.code}</strong>. It works once, until{" "}
          {formatDate(code.expires_at, organization.timezone)}. They enter it after signing in on the gym site.
        </p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        tone="critical"
        title={`Unlink ${member.name}'s sign-in?`}
        confirmLabel="Unlink"
        pendingLabel="Unlinking…"
        pending={unlink.pending}
        onConfirm={async () => {
          const result = await unlink.run({ slug: organization.slug, id: member.id });
          setConfirming(false);
          if (result.ok) {
            toast.show({ tone: "success", title: "Sign-in unlinked", body: "The member record and its history stay." });
            void router.invalidate();
          } else {
            toast.show({ tone: "error", title: "The sign-in was not unlinked", body: failureMessage(result.error) });
          }
        }}
        onCancel={() => setConfirming(false)}
      >
        <p>They can no longer see this membership on the gym site until they link again with a new code.</p>
      </ConfirmDialog>
    </>
  );
}

/* ---------- Loading ---------- */

/** Keeps the page shape while the member loads, so nothing jumps. */
export function MemberDetailsLoading() {
  return (
    <div className="page member-page member-details" role="status" aria-busy="true" aria-label="Loading member">
      <div className="member-head">
        <span className="member-head__avatar skeleton-block" />
        <div className="member-head__text">
          <span className="skeleton-line" style={{ width: 180 }} />
          <span className="skeleton-line skeleton-line--small" style={{ width: 240 }} />
        </div>
      </div>
      <div className="member-details__membership">
        {[0, 1].map((index) => (
          <div key={index} className="mx-section">
            <div className="mx-section__head" />
            <span className="skeleton-line" style={{ width: "60%" }} />
            <span className="skeleton-line skeleton-line--small" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
