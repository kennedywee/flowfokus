import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon, type IconName } from "@/components/ui/icon";
import { Kbd } from "../../components/ui";
import { PageActions } from "../../components/PageActions";
import {
  PAYMENT_METHOD_LABEL,
  PRODUCT_KIND_LABEL,
  formatBenefitUsage,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatWhen,
} from "../../lib/format";
import { useCan, useLocationName, useOrganization } from "../../lib/organization";
import { useShortcut } from "../../lib/shortcuts";
import { useShortDate } from "../members/dates";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fulfillmentFact, saleActions, saleActivity, type SaleActions } from "./facts";
import { FulfillDialog, KIND_ICON, ReasonDialog, RecordPaymentDialog, RefundDialog } from "./SaleDialogs";
import { FulfillmentMark, METHOD_ICON, PaymentMark } from "./SaleFacts";

const icon = { "aria-hidden": true, focusable: false } as const;
const markIcon = { "aria-hidden": true, focusable: false } as const;

type Open = "pay" | "fulfill" | "refund" | "void" | "revoke" | null;

/**
 * One page per sale: the item and its fulfillment, the payments and the balance,
 * and what happened, with the sale's properties on the right. Payment and
 * fulfillment are separate facts. Every action opens a dialog that states its
 * consequence; Rails decides whether it is allowed.
 */
export function SaleDetails({ sale }: { sale: Schemas["Sale"] }) {
  const can = useCan();
  const actions = saleActions(sale, can);
  const [open, setOpen] = useState<Open>(null);
  const canFulfill = actions.fulfill === "ready" || actions.fulfill === "early";
  useShortcut("p", () => setOpen("pay"), { enabled: actions.pay });
  useShortcut("f", () => setOpen("fulfill"), { enabled: canFulfill });

  return (
    <div className="page sale-details">
      <SaleHeader sale={sale} actions={actions} onOpen={setOpen} />
      <div className="sale-details__main">
        {sale.voided_at ? <VoidBanner sale={sale} /> : null}
        <ItemsSection sale={sale} actions={actions} onFulfill={() => setOpen("fulfill")} />
        <PaymentSection sale={sale} canPay={actions.pay} onPay={() => setOpen("pay")} />
        <ActivitySection sale={sale} />
      </div>
      <SaleProperties sale={sale} />
      {open === "pay" ? <RecordPaymentDialog sale={sale} onClose={() => setOpen(null)} /> : null}
      {open === "fulfill" && canFulfill ? (
        <FulfillDialog sale={sale} early={actions.fulfill === "early"} onClose={() => setOpen(null)} />
      ) : null}
      {open === "refund" ? <RefundDialog sale={sale} onClose={() => setOpen(null)} /> : null}
      {open === "void" || open === "revoke" ? <ReasonDialog sale={sale} kind={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

/* ---------- Header ---------- */

function SaleHeader({ sale, actions, onOpen }: { sale: Schemas["Sale"]; actions: SaleActions; onOpen: (open: Open) => void }) {
  const line = sale.line_item;
  const canFulfill = actions.fulfill === "ready" || actions.fulfill === "early";
  const corrections = actions.refund || actions.revoke || actions.void;
  const any = actions.pay || canFulfill || corrections;

  return (
    <header className="sale-head">
      <span className="sale-head__tile" aria-hidden="true">
        <Icon name="sales" {...icon} />
      </span>
      <div className="sale-head__text">
        <div className="sale-head__title">
          <h1>{line.product_name}</h1>
          <span className="sale-head__facts">
            <PaymentMark sale={sale} className="sale-pill" />
            <FulfillmentMark sale={sale} className="sale-pill" />
          </span>
        </div>
        <p className="sale-head__meta">
          {sale.member.name} · {line.price_label}
          {sale.renewal ? " · Renewal" : ""}
        </p>
      </div>
      {any ? (
        <PageActions>
          <DropdownMenu>
            <DropdownMenuTrigger className="button button--ghost button--icon button--compact" aria-label="Sale actions">
              <Icon name="more" {...icon} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="sale-menu">
              {actions.pay ? (
                <DropdownMenuItem onClick={() => onOpen("pay")}>
                  <Icon name="cash" {...markIcon} />
                  Record payment
                  <DropdownMenuShortcut>
                    <Kbd>P</Kbd>
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              ) : null}
              {canFulfill ? (
                <DropdownMenuItem onClick={() => onOpen("fulfill")}>
                  <Icon name="fulfilled" {...markIcon} />
                  {actions.fulfill === "early" ? "Fulfill early…" : "Fulfill"}
                  <DropdownMenuShortcut>
                    <Kbd>F</Kbd>
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              ) : null}
              {(actions.pay || canFulfill) && corrections ? <DropdownMenuSeparator /> : null}
              {actions.refund ? (
                <DropdownMenuItem onClick={() => onOpen("refund")}>
                  <Icon name="arrowDown" {...markIcon} />
                  Refund…
                </DropdownMenuItem>
              ) : null}
              {actions.revoke ? (
                <DropdownMenuItem className="menu__item--critical" onClick={() => onOpen("revoke")}>
                  <Icon name="roles" {...markIcon} />
                  Revoke access…
                </DropdownMenuItem>
              ) : null}
              {actions.void ? (
                <DropdownMenuItem className="menu__item--critical" onClick={() => onOpen("void")}>
                  <Icon name="close" {...markIcon} />
                  Void sale…
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </PageActions>
      ) : null}
    </header>
  );
}

function VoidBanner({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  return (
    <div className="sale-void">
      <Icon name="close" className="sale-void__icon" {...markIcon} />
      <div>
        <p className="sale-void__title">This sale was voided</p>
        <p className="sale-void__sub">
          {sale.void_reason ? `${sale.void_reason} · ` : ""}
          <time dateTime={sale.voided_at!} suppressHydrationWarning>
            {formatWhen(sale.voided_at!, organization.timezone)}
          </time>
        </p>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

/** A section: a grey band with an icon, a title, and an optional action. */
function Band({ id, title, icon: iconName, action }: { id: string; title: string; icon: IconName; action?: ReactNode }) {
  return (
    <div className="mx-section__head sale-band">
      <Icon name={iconName} {...icon} />
      <h2 id={`${id}-title`}>{title}</h2>
      {action}
    </div>
  );
}

/** What the sale is for, and its fulfillment: when it happened, early fulfillment, or revoked access. */
function ItemsSection({ sale, actions, onFulfill }: { sale: Schemas["Sale"]; actions: SaleActions; onFulfill: () => void }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const shortDate = useShortDate();
  const line = sale.line_item;
  const kindIcon = KIND_ICON[line.terms.kind];
  const fulfillment = sale.fulfillment;
  const period = fulfillment?.membership_period;
  const fact = fulfillmentFact(sale);

  const sub = sale.occurrence
    ? `${sale.occurrence.program_name} · ${formatDateTime(sale.occurrence.starts_at, organization.timezone)}`
    : period
      ? `${shortDate(period.starts_at)} – ${shortDate(period.ends_at)}`
      : `${PRODUCT_KIND_LABEL[line.terms.kind]} · ${formatDuration(line.terms.duration_days)}`;

  return (
    <section className="mx-section sale-section" aria-labelledby="items-title">
      <Band
        id="items"
        title="Items"
        icon="products"
        action={
          actions.fulfill === "ready" || actions.fulfill === "early" ? (
            <Button type="button" variant="secondary" size="compact" className="sale-band__button" onClick={onFulfill}>
              {actions.fulfill === "early" ? "Fulfill early" : "Fulfill"}
            </Button>
          ) : null
        }
      />
      <div className="sale-group">
        <FulfillmentMark sale={sale} />
        {fulfillment ? (
          <span className="sale-group__when">
            {fact.state === "revoked" ? "Fulfilled " : ""}
            <time dateTime={fulfillment.fulfilled_at} suppressHydrationWarning>
              {formatWhen(fulfillment.fulfilled_at, organization.timezone)}
            </time>
          </span>
        ) : null}
      </div>
      <div className="sale-line">
        <span className="sale-tile" aria-hidden="true">
          <Icon name={kindIcon} {...markIcon} />
        </span>
        <div className="sale-line__main">
          <span className="sale-line__name">{line.product_name}</span>
          <span className="sale-line__sub" suppressHydrationWarning>
            {sub}
            {sale.renewal ? " · Agreed price" : ""}
          </span>
          {line.terms.benefits.map((benefit, index) => (
            <span key={index} className="sale-line__sub">
              {benefit.name} · {formatBenefitUsage(benefit)} · {locationName(benefit.location_id)}
            </span>
          ))}
          {sale.attendees.length ? (
            <span className="sale-line__sub">
              {sale.attendees.map((person) => (person.guest ? `${person.name} (guest)` : person.name)).join(", ")}
            </span>
          ) : null}
        </div>
        <span className="sale-line__unit">
          {formatMoney(line.unit_amount_minor, line.currency)} × {line.quantity}
        </span>
        <span className="sale-line__total">{formatMoney(line.total_minor, line.currency)}</span>
      </div>
      {fulfillment?.early ? (
        <p className="sale-note" data-tone="warning">
          Fulfilled before full payment. {formatMoney(fulfillment.unpaid_minor, sale.currency)} was due
          {fulfillment.early_reason ? ` · ${fulfillment.early_reason}` : ""}
        </p>
      ) : null}
      {fact.state === "revoked" && fulfillment?.revoked_at ? (
        <p className="sale-note" data-tone="critical">
          Access revoked{" "}
          <time dateTime={fulfillment.revoked_at} suppressHydrationWarning>
            {formatWhen(fulfillment.revoked_at, organization.timezone)}
          </time>
          {fulfillment.revoke_reason ? ` · ${fulfillment.revoke_reason}` : ""}
        </p>
      ) : null}
      {actions.fulfill === "blocked" ? (
        <p className="sale-note">Fulfillment opens when the sale is paid in full. {formatMoney(sale.balance_minor, sale.currency)} is still due.</p>
      ) : null}
      {fulfillment && !fulfillment.revoked_at && !sale.voided_at ? (
        <p className="sale-note">
          {sale.occurrence ? (
            <Link to="/$org/schedule/$occurrenceId" params={{ org: organization.slug, occurrenceId: sale.occurrence.id }}>
              Open the roster
            </Link>
          ) : (
            <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: sale.member.id }}>
              See {sale.member.name}'s access
            </Link>
          )}
        </p>
      ) : null}
      <div className="sale-total">
        <span>Total</span>
        <span className="sale-total__amount">{formatMoney(sale.total_minor, sale.currency)}</span>
      </div>
    </section>
  );
}

type MoneyRow =
  | { kind: "payment"; at: string; payment: Schemas["Payment"] }
  | { kind: "refund"; at: string; refund: Schemas["Refund"]; payment: Schemas["Payment"] | undefined };

/** Payments and refunds, oldest first, then the balance due. */
function PaymentSection({ sale, canPay, onPay }: { sale: Schemas["Sale"]; canPay: boolean; onPay: () => void }) {
  const organization = useOrganization();
  const rows: MoneyRow[] = [
    ...sale.payments.map((payment) => ({ kind: "payment" as const, at: payment.received_at, payment })),
    ...sale.refunds.map((refund) => ({
      kind: "refund" as const,
      at: refund.refunded_at,
      refund,
      payment: sale.payments.find((payment) => payment.id === refund.payment_id),
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const due = !sale.voided_at && sale.balance_minor > 0;

  return (
    <section className="mx-section sale-section" aria-labelledby="payment-title">
      <Band
        id="payment"
        title="Payment"
        icon="cash"
        action={
          canPay ? (
            <Button type="button" variant="secondary" size="compact" className="sale-band__button" onClick={onPay}>
              Record payment
            </Button>
          ) : null
        }
      />
      {rows.length ? (
        <ul className="sale-money-rows">
          {rows.map((row) => {
            if (row.kind === "payment") {
              const { payment } = row;
              const methodIcon = METHOD_ICON[payment.method];
              return (
                <li key={payment.id} className="sale-line">
                  <span className="sale-tile" aria-hidden="true">
                    <Icon name={methodIcon} {...markIcon} />
                  </span>
                  <div className="sale-line__main">
                    <span className="sale-line__name">
                      {PAYMENT_METHOD_LABEL[payment.method]}
                      {payment.method === "online" && payment.provider ? ` · ${payment.provider}` : ""}
                    </span>
                    <span className="sale-line__sub">
                      {payment.reference ? `Ref. ${payment.reference} · ` : ""}
                      <time dateTime={payment.received_at} suppressHydrationWarning>
                        {formatWhen(payment.received_at, organization.timezone)}
                      </time>
                      {payment.refunded_minor > 0 ? ` · ${formatMoney(payment.refunded_minor, payment.currency)} refunded` : ""}
                    </span>
                  </div>
                  <span className="sale-line__total">{formatMoney(payment.amount_minor, payment.currency)}</span>
                </li>
              );
            }
            const { refund, payment } = row;
            return (
              <li key={refund.id} className="sale-line">
                <span className="sale-tile sale-tile--critical" aria-hidden="true">
                  <Icon name="arrowDown" {...markIcon} />
                </span>
                <div className="sale-line__main">
                  <span className="sale-line__name">Refund{payment ? ` · ${PAYMENT_METHOD_LABEL[payment.method]}` : ""}</span>
                  <span className="sale-line__sub">
                    {refund.reason} ·{" "}
                    <time dateTime={refund.refunded_at} suppressHydrationWarning>
                      {formatWhen(refund.refunded_at, organization.timezone)}
                    </time>
                  </span>
                </div>
                <span className="sale-line__total sale-line__total--critical">
                  <span className="visually-hidden">Minus </span>−{formatMoney(refund.amount_minor, refund.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="sale-empty">No payments yet</p>
      )}
      <div className="sale-total" data-state={sale.voided_at ? "void" : due ? "due" : undefined}>
        <span>Balance due</span>
        <span className="sale-total__amount">{formatMoney(sale.voided_at ? 0 : sale.balance_minor, sale.currency)}</span>
      </div>
    </section>
  );
}

function ActivitySection({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const events = saleActivity(sale);
  return (
    <section className="mx-section mx-activity" aria-labelledby="activity-title">
      <div className="mx-activity__head">
        <Icon name="activity" {...icon} />
        <h2 id="activity-title">Activity</h2>
      </div>
      <ol className="mx-feed">
        {events.map((event) => (
          <li key={event.id} className="mx-feed__item">
            <span className="mx-feed__dot" data-tone={event.tone} aria-hidden="true" />
            <span className="mx-feed__text">{event.text}</span>
            <time className="mx-feed__when" dateTime={event.at} suppressHydrationWarning>
              {formatWhen(event.at, organization.timezone)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Properties ---------- */

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mx-prop">
      <dt>{label}</dt>
      <dd>
        <span className="mx-value">{children}</span>
      </dd>
    </div>
  );
}

function SaleProperties({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  return (
    <aside className="mx-props" aria-label="Sale properties">
      <section className="mx-props__group" aria-labelledby="props-details">
        <h2 id="props-details">Details</h2>
        <dl>
          <Property label="Member">
            <Icon name="profile" {...markIcon} />
            <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: sale.member.id }}>
              {sale.member.name}
            </Link>
          </Property>
          <Property label={sale.channel === "online" ? "Channel" : "Location"}>
            <Icon name="location" {...markIcon} />
            <span className="mx-value__text">{sale.channel === "online" ? "Online" : locationName(sale.location_id)}</span>
          </Property>
          <Property label="Date">
            <Icon name="schedule" {...markIcon} />
            <time dateTime={sale.purchased_at} suppressHydrationWarning>
              {formatDateTime(sale.purchased_at, organization.timezone)}
            </time>
          </Property>
          <Property label="Price">
            <Icon name="products" {...markIcon} />
            <span className="mx-value__text">
              {sale.line_item.price_label}
              {sale.renewal ? " · Agreed price" : ""}
            </span>
          </Property>
          {sale.attendees.length > 1 ? (
            <Property label="Spots">
              <Icon name="members" {...markIcon} />
              <span className="mx-value__text">{sale.attendees.length}</span>
            </Property>
          ) : null}
        </dl>
      </section>
    </aside>
  );
}

/* ---------- Loading ---------- */

/** Keeps the page shape while the sale loads. */
export function SaleDetailsLoading() {
  return (
    <div className="page sale-details" role="status" aria-busy="true" aria-label="Loading sale">
      <div className="sale-head">
        <span className="sale-head__tile skeleton-block" />
        <div className="sale-head__text">
          <span className="skeleton-line" style={{ width: 200 }} />
          <span className="skeleton-line skeleton-line--small" style={{ width: 160 }} />
        </div>
      </div>
      <div className="sale-details__main">
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
