import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { Kbd, Notice } from "../../components/ui";
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
import { saleMarks } from "../members/facts";
import { Empty, Section } from "../members/Section";
import { ActivityFeed, type FeedItem } from "@/components/parts/Activity";
import { DetailHero, DetailLayout, HeroTile, PanelGroup, PanelRow, PanelRows } from "@/components/parts/DetailLayout";
import {
  CellStack,
  ListGroup,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableLoading,
  ListTableRow,
  type ListColumn,
} from "@/components/parts/ListTable";
import { StatusMark, Tile } from "@/components/parts/marks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fulfillmentFact, saleActions, saleActivity, type SaleActions } from "./facts";
import { FulfillDialog, KIND_ICON, ReasonDialog, RecordPaymentDialog, RefundDialog } from "./SaleDialogs";

const icon = { "aria-hidden": true, focusable: false } as const;

type Open = "pay" | "fulfill" | "refund" | "void" | "revoke" | null;

/** Activity shows this many events before "Show N earlier events". */
const RECENT = 5;

/**
 * One page per sale (Paper "Sale details"): the hero with the payment and
 * fulfillment facts, Items, Payments, and Activity on the left; Details on the
 * right, on the ledger-rule pattern. Record payment (P) and Fulfill (F) sit in
 * their section headers; Refund, Revoke access, and Void are in the top bar's
 * more menu. Every action opens a dialog that states its consequence; Rails
 * decides whether it is allowed. It shows only what Rails returns: no sale
 * number, sold by, payment recorder, note, comments, invoice, several lines,
 * or fulfillment per line (issue #18).
 */
export function SaleDetails({ sale }: { sale: Schemas["Sale"] }) {
  const can = useCan();
  const actions = saleActions(sale, can);
  const [open, setOpen] = useState<Open>(null);
  const canFulfill = actions.fulfill === "ready" || actions.fulfill === "early";
  useShortcut("p", () => setOpen("pay"), { enabled: actions.pay });
  useShortcut("f", () => setOpen("fulfill"), { enabled: canFulfill });

  return (
    <>
      <DetailLayout record="sale" className="sale-details" panel={<SaleDetailsPanel sale={sale} />}>
        <SaleHero sale={sale} />
        <SaleMenu actions={actions} onOpen={setOpen} />
        {sale.voided_at ? <VoidNotice sale={sale} /> : null}
        <ItemsSection sale={sale} actions={actions} onFulfill={() => setOpen("fulfill")} />
        <PaymentsSection sale={sale} canPay={actions.pay} onPay={() => setOpen("pay")} />
        <SaleActivity sale={sale} />
      </DetailLayout>
      {open === "pay" ? <RecordPaymentDialog sale={sale} onClose={() => setOpen(null)} /> : null}
      {open === "fulfill" && canFulfill ? (
        <FulfillDialog sale={sale} early={actions.fulfill === "early"} onClose={() => setOpen(null)} />
      ) : null}
      {open === "refund" ? <RefundDialog sale={sale} onClose={() => setOpen(null)} /> : null}
      {open === "void" || open === "revoke" ? <ReasonDialog sale={sale} kind={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

/* ---------- Hero and menu ---------- */

/**
 * A receipt tile, the item as the title (Rails has no sale number), and the
 * two facts as pills: payment, then fulfillment. The words are Rails' (#14).
 */
function SaleHero({ sale }: { sale: Schemas["Sale"] }) {
  const marks = saleMarks(sale);
  return (
    <DetailHero
      tile={<HeroTile icon="sales" />}
      title={sale.line_item.product_name}
      line={sale.renewal ? "Renewal" : undefined}
    >
      <StatusMark boxed kind={marks.payment.kind} tone={marks.payment.tone}>
        {marks.payment.label}
      </StatusMark>
      <StatusMark boxed kind={marks.fulfillment.kind} tone={marks.fulfillment.tone}>
        {marks.fulfillment.label}
      </StatusMark>
    </DetailHero>
  );
}

/** The top bar's more menu: Refund, Revoke access, and Void. It has no items, so no button, when none is allowed. */
function SaleMenu({ actions, onOpen }: { actions: SaleActions; onOpen: (open: Open) => void }) {
  if (!actions.refund && !actions.revoke && !actions.void) return null;
  return (
    <PageActions>
      <DropdownMenu>
        <DropdownMenuTrigger className="button button--ghost button--icon button--compact" aria-label="Sale actions">
          <Icon name="more" {...icon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="sale-menu">
          {actions.refund ? (
            <DropdownMenuItem onClick={() => onOpen("refund")}>
              <Icon name="arrowDown" {...icon} />
              Refund…
            </DropdownMenuItem>
          ) : null}
          {actions.revoke ? (
            <DropdownMenuItem className="menu__item--critical" onClick={() => onOpen("revoke")}>
              <Icon name="roles" {...icon} />
              Revoke access…
            </DropdownMenuItem>
          ) : null}
          {actions.void ? (
            <DropdownMenuItem className="menu__item--critical" onClick={() => onOpen("void")}>
              <Icon name="close" {...icon} />
              Void sale…
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </PageActions>
  );
}

function VoidNotice({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  return (
    <Notice tone="error" title="This sale was voided">
      <p>
        {sale.void_reason ? `${sale.void_reason} · ` : ""}
        <time dateTime={sale.voided_at!} suppressHydrationWarning>
          {formatWhen(sale.voided_at!, organization.timezone)}
        </time>
      </p>
    </Notice>
  );
}

/* ---------- Items ---------- */

const ITEM_COLUMNS: ListColumn[] = [
  { id: "item", label: "Item" },
  { id: "price", label: "Price", width: "132px", align: "end" },
  { id: "total", label: "Total", width: "110px", align: "end" },
];

/** The group's mark: the fulfillment fact's ring, coloured by its state. */
const GROUP_MARK = {
  fulfilled: { name: "fulfilled", tone: "good" },
  revoked: { name: "close", tone: "critical" },
  waiting: { name: "unfulfilled", tone: "neutral" },
  none: { name: "unfulfilled", tone: "neutral" },
} as const;

/**
 * What the sale is for. Rails sells one line, so there is one group: Fulfilled,
 * Unfulfilled, or Access revoked, with a count of one. The row has the item,
 * its terms, the unit price and quantity, and the line total, then the sale
 * total. Fulfill (F) is in the header when the sale can be fulfilled.
 */
function ItemsSection({ sale, actions, onFulfill }: { sale: Schemas["Sale"]; actions: SaleActions; onFulfill: () => void }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const shortDate = useShortDate();
  const line = sale.line_item;
  const fulfillment = sale.fulfillment;
  const period = fulfillment?.membership_period;
  const fact = fulfillmentFact(sale);
  const mark = GROUP_MARK[fact.state];

  const sold = sale.occurrence
    ? `${sale.occurrence.program_name} · ${formatDateTime(sale.occurrence.starts_at, organization.timezone)}`
    : period
      ? `${shortDate(period.starts_at)} – ${shortDate(period.ends_at)}`
      : `${PRODUCT_KIND_LABEL[line.terms.kind]} · ${formatDuration(line.terms.duration_days)}`;
  // The price that was sold. Left out when the line already says it.
  const terms = line.price_label && !sold.toLowerCase().includes(line.price_label.toLowerCase()) ? `${sold} · ${line.price_label}` : sold;
  const canFulfill = actions.fulfill === "ready" || actions.fulfill === "early";

  return (
    <Section
      id="items"
      title="Items"
      action={
        canFulfill ? (
          <Button type="button" variant="secondary" size="compact" aria-keyshortcuts="F" onClick={onFulfill}>
            {actions.fulfill === "early" ? "Fulfill early" : "Fulfill items"}
            <Kbd>F</Kbd>
          </Button>
        ) : null
      }
    >
      <ListTable label="Items" density="two-line" className="list-table--bare sale-items" columns={ITEM_COLUMNS}>
        <ListGroup
          label={fact.label}
          count={1}
          mark={
            <span className="status-mark" data-tone={mark.tone}>
              <Icon name={mark.name} size={14} {...icon} />
            </span>
          }
        >
          <ListTableBody>
            <ListTableRow>
              <ListTableCell>
                <span className="cell-stack">
                  <Tile square>
                    <Icon name={KIND_ICON[line.terms.kind]} size={16} {...icon} />
                  </Tile>
                  <span className="cell-stack__text">
                    <span className="cell-stack__title">
                      <span>{line.product_name}</span>
                    </span>
                    <span className="cell-stack__sub" suppressHydrationWarning>
                      {terms}
                      {sale.renewal ? " · Agreed price" : ""}
                    </span>
                    {line.terms.benefits.map((benefit, index) => (
                      <span key={index} className="cell-stack__sub">
                        {benefit.name} · {formatBenefitUsage(benefit)} · {locationName(benefit.location_id)}
                      </span>
                    ))}
                    {sale.attendees.length ? (
                      <span className="cell-stack__sub" data-wrap>
                        {sale.attendees.map((person) => (person.guest ? `${person.name} (guest)` : person.name)).join(", ")}
                      </span>
                    ) : null}
                  </span>
                </span>
              </ListTableCell>
              <ListTableCell align="end" className="cell-muted sale-items__unit">
                {formatMoney(line.unit_amount_minor, line.currency)} × {line.quantity}
              </ListTableCell>
              <ListTableCell align="end" className="cell-figure sale-items__total">
                {formatMoney(line.total_minor, line.currency)}
              </ListTableCell>
            </ListTableRow>
          </ListTableBody>
        </ListGroup>
      </ListTable>
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
            <Link to="/$org/calendar/$occurrenceId" params={{ org: organization.slug, occurrenceId: sale.occurrence.id }}>
              Open the roster
            </Link>
          ) : (
            <Link to="/$org/members/$memberId" params={{ org: organization.slug, memberId: sale.member.id }}>
              See {sale.member.name}'s access
            </Link>
          )}
        </p>
      ) : null}
      <dl className="sale-sum">
        <div className="sale-sum__row">
          <dt>Total</dt>
          <dd>{formatMoney(sale.total_minor, sale.currency)}</dd>
        </div>
      </dl>
    </Section>
  );
}

/* ---------- Payments ---------- */

const PAYMENT_COLUMNS: ListColumn[] = [
  { id: "payment", label: "Payment" },
  { id: "amount", label: "Amount", width: "112px", align: "end" },
];

type MoneyRow =
  | { kind: "payment"; at: string; payment: Schemas["Payment"] }
  | { kind: "refund"; at: string; refund: Schemas["Refund"]; payment: Schemas["Payment"] | undefined };

/**
 * Payments and refunds, oldest first: the method and when, then the amount.
 * Then the balance due, in the warning colour while money is owed. Record
 * payment (P) is in the header when the sale can take one. Rails does not say
 * who recorded a payment, and Send invoice does not exist yet (issue #18).
 */
function PaymentsSection({ sale, canPay, onPay }: { sale: Schemas["Sale"]; canPay: boolean; onPay: () => void }) {
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
    <Section
      id="payments"
      title="Payments"
      action={
        canPay ? (
          <Button type="button" variant="secondary" size="compact" aria-keyshortcuts="P" onClick={onPay}>
            <Icon name="plus" size={14} {...icon} />
            Record payment
            <Kbd>P</Kbd>
          </Button>
        ) : null
      }
    >
      {rows.length ? (
        <ListTable label="Payments" density="two-line" className="list-table--bare sale-payments" columns={PAYMENT_COLUMNS}>
          <ListTableBody>
            {rows.map((row) =>
              row.kind === "payment" ? (
                <ListTableRow key={row.payment.id}>
                  <ListTableCell>
                    <CellStack
                      title={
                        <>
                          {PAYMENT_METHOD_LABEL[row.payment.method]}
                          {row.payment.method === "online" && row.payment.provider ? ` · ${row.payment.provider}` : ""}
                        </>
                      }
                      sub={
                        <>
                          {row.payment.reference ? `Ref. ${row.payment.reference} · ` : ""}
                          <time dateTime={row.payment.received_at} suppressHydrationWarning>
                            {formatWhen(row.payment.received_at, organization.timezone)}
                          </time>
                          {row.payment.refunded_minor > 0 ? ` · ${formatMoney(row.payment.refunded_minor, row.payment.currency)} refunded` : ""}
                        </>
                      }
                    />
                  </ListTableCell>
                  <ListTableCell align="end" className="cell-figure">
                    {formatMoney(row.payment.amount_minor, row.payment.currency)}
                  </ListTableCell>
                </ListTableRow>
              ) : (
                <ListTableRow key={row.refund.id}>
                  <ListTableCell>
                    <CellStack
                      title={`Refund${row.payment ? ` · ${PAYMENT_METHOD_LABEL[row.payment.method]}` : ""}`}
                      sub={
                        <>
                          {row.refund.reason} ·{" "}
                          <time dateTime={row.refund.refunded_at} suppressHydrationWarning>
                            {formatWhen(row.refund.refunded_at, organization.timezone)}
                          </time>
                        </>
                      }
                    />
                  </ListTableCell>
                  <ListTableCell align="end" className="cell-figure sale-payments__refund">
                    <span className="visually-hidden">Minus </span>−{formatMoney(row.refund.amount_minor, row.refund.currency)}
                  </ListTableCell>
                </ListTableRow>
              ),
            )}
          </ListTableBody>
        </ListTable>
      ) : (
        <Empty>No payments yet</Empty>
      )}
      <dl className="sale-sum" data-state={sale.voided_at ? "void" : due ? "due" : undefined}>
        <div className="sale-sum__row">
          <dt>Balance due</dt>
          <dd>{formatMoney(sale.voided_at ? 0 : sale.balance_minor, sale.currency)}</dd>
        </div>
      </dl>
    </Section>
  );
}

/* ---------- Activity ---------- */

/** What Rails recorded: the sale, payments, fulfillment, refunds, and void. No comment box: Rails has no comments. */
function SaleActivity({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const items = saleActivity(sale).map(
    (event): FeedItem => ({
      kind: "event",
      id: event.id,
      tone: event.tone,
      time: formatWhen(event.at, organization.timezone),
      children: event.text,
    }),
  );
  return <ActivityFeed items={items} visible={RECENT} />;
}

/* ---------- Details panel ---------- */

/** The right panel: the member, the location (or the online channel), and the date. Rails has no sold-by or note. */
function SaleDetailsPanel({ sale }: { sale: Schemas["Sale"] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  return (
    <PanelGroup title="Details">
      <PanelRows>
        <PanelRow label="Member">
          <Link className="panel-link" to="/$org/members/$memberId" params={{ org: organization.slug, memberId: sale.member.id }}>
            {sale.member.name}
          </Link>
        </PanelRow>
        <PanelRow label={sale.channel === "online" ? "Channel" : "Location"}>
          {sale.channel === "online" ? "Online" : locationName(sale.location_id)}
        </PanelRow>
        <PanelRow label="Date">
          <time dateTime={sale.purchased_at} suppressHydrationWarning>
            {formatDateTime(sale.purchased_at, organization.timezone)}
          </time>
        </PanelRow>
      </PanelRows>
    </PanelGroup>
  );
}

/* ---------- Loading ---------- */

/** Keeps the page shape while the sale loads. */
export function SaleDetailsLoading() {
  return (
    <DetailLayout record="sale" className="sale-details">
      <div role="status" aria-busy="true" aria-label="Loading sale" className="sale-loading">
        <header className="hero">
          <span className="tile tile--hero skeleton" />
          <div className="hero__text">
            <span className="skeleton sale-loading__title" />
            <span className="skeleton sale-loading__line" />
          </div>
        </header>
        <section className="member-section">
          <div className="member-section__head">
            <h2>Items</h2>
          </div>
          <ListTable label="Items (loading)" density="two-line" className="list-table--bare" columns={ITEM_COLUMNS}>
            <ListTableLoading rows={2} label="Loading items" />
          </ListTable>
        </section>
      </div>
    </DetailLayout>
  );
}
