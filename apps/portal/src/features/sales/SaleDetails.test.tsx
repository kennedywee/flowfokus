import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Permission, Schemas } from "@flowfokus/api";
import { state } from "./test-mocks";

const { SaleDetails } = await import("./SaleDetails");

function sale(overrides: Partial<Schemas["Sale"]> = {}): Schemas["Sale"] {
  return {
    id: "sale-1",
    member: { id: "member-1", name: "Hafiz Rahman", email: "hafiz@example.com" },
    location_id: "loc-1",
    channel: "desk",
    occurrence: null,
    booking_id: null,
    booking_ids: [],
    attendees: [],
    currency: "MYR",
    total_minor: 22000,
    paid_minor: 12000,
    balance_minor: 10000,
    payment_status: "partially_paid",
    fulfilled: false,
    renewal: false,
    refunded_minor: 0,
    voided_at: null,
    void_reason: null,
    refunds: [],
    purchased_at: "2026-11-20T10:00:00Z",
    line_item: {
      product_name: "Monthly unlimited",
      price_label: "Monthly",
      quantity: 1,
      unit_amount_minor: 22000,
      total_minor: 22000,
      currency: "MYR",
      terms: { kind: "membership", duration_days: 30, benefits: [] },
    } as unknown as Schemas["SaleLineItem"],
    payments: [{ id: "p1", amount_minor: 12000, currency: "MYR", method: "cash", provider: null, reference: null, received_at: "2026-11-20T10:05:00Z", refunded_minor: 0 }],
    fulfillment: null,
    ...overrides,
  } as Schemas["Sale"];
}

const OWNER: Permission[] = ["purchases:fulfill", "purchases:fulfill_unpaid", "payments:create", "purchases:refund", "purchases:void", "memberships:revoke"];
const render = (value: Schemas["Sale"], can: Permission[] = OWNER) => {
  state.allowed = can;
  return renderToStaticMarkup(createElement(SaleDetails, { sale: value })).replaceAll(" ", " ");
};

describe("SaleDetails", () => {
  test("a part paid sale shows both facts, the Unfulfilled group, and what is due in the warning state", () => {
    const html = render(sale());
    expect(html).toContain("Part paid");
    expect(html).toContain("Unfulfilled");
    expect(html).toContain("Monthly unlimited");
    expect(html).toContain("RM 220.00");
    expect(html).toContain('<dl class="sale-sum" data-state="due"><div class="sale-sum__row"><dt>Balance due</dt><dd>RM 100.00</dd>');
    // The ledger pattern, and the panel with the member link, location, and date.
    expect(html).toContain('data-record="sale"');
    expect(html).toContain("Hafiz Rahman");
    expect(html).toContain("Bangsar");
  });

  test("Fulfill early and Record payment show with their keys while both are allowed", () => {
    const html = render(sale());
    expect(html).toContain('aria-keyshortcuts="F"');
    expect(html).toContain("Fulfill early");
    expect(html).toContain('aria-keyshortcuts="P"');
    expect(html).toContain("Record payment");
  });

  test("without purchases:fulfill_unpaid the sale cannot be fulfilled early, and says why", () => {
    const html = render(sale(), ["purchases:fulfill", "payments:create"]);
    expect(html).not.toContain("Fulfill early");
    expect(html).not.toContain("Fulfill items");
    expect(html).toContain("Fulfillment opens when the sale is paid in full. RM 100.00 is still due.");
  });

  test("a paid sale offers Fulfill items, and no Record payment", () => {
    const html = render(sale({ payment_status: "paid", paid_minor: 22000, balance_minor: 0 }));
    expect(html).toContain("Fulfill items");
    expect(html).not.toContain("Record payment");
    expect(html).not.toContain('data-state="due"');
  });

  test("a fulfilled sale shows the Fulfilled group and the link to the member's access, and no Fulfill", () => {
    const html = render(
      sale({
        payment_status: "paid",
        paid_minor: 22000,
        balance_minor: 0,
        fulfilled: true,
        fulfillment: { id: "f1", fulfilled_at: "2026-11-20T10:10:00Z", early: false, unpaid_minor: 0, early_reason: null, revoked_at: null, revoke_reason: null, membership_period: null } as unknown as Schemas["Fulfillment"],
      }),
    );
    expect(html).toContain("Fulfilled");
    expect(html).toContain("See Hafiz Rahman&#x27;s access");
    expect(html).not.toContain("Fulfill items");
  });

  test("a voided sale shows the notice with its reason, no actions, and a zero balance", () => {
    const html = render(sale({ payment_status: "void", voided_at: "2026-11-20T11:00:00Z", void_reason: "Entered twice", payments: [], paid_minor: 0 }));
    expect(html).toContain("This sale was voided");
    expect(html).toContain("Entered twice");
    expect(html).toContain('data-state="void"');
    expect(html).not.toContain("Record payment");
    expect(html).not.toContain("Fulfill");
  });

  test("a refund shows as a negative row, and the refunded part of its payment", () => {
    const html = render(
      sale({
        payment_status: "paid",
        paid_minor: 22000,
        balance_minor: 0,
        refunded_minor: 1000,
        payments: [{ id: "p1", amount_minor: 22000, currency: "MYR", method: "cash", provider: null, reference: null, received_at: "2026-11-20T10:05:00Z", refunded_minor: 1000 }],
        refunds: [{ id: "r1", payment_id: "p1", amount_minor: 1000, currency: "MYR", reason: "Goodwill", refunded_at: "2026-11-20T12:00:00Z" } as unknown as Schemas["Refund"]],
      }),
    );
    expect(html).toContain("Refund · Cash");
    expect(html).toContain("−RM 10.00");
    expect(html).toContain("RM 10.00 refunded");
  });

  test("activity lists only what Rails recorded, without a comment box", () => {
    const html = render(sale());
    expect(html).toContain("Sold · RM 220.00");
    expect(html).toContain("Paid RM 120.00 by cash");
    expect(html).not.toContain("Leave a comment");
  });
});
