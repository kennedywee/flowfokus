import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Schemas } from "@flowfokus/api";
import { state } from "./test-mocks";

const { SalesList } = await import("./SalesList");

function sale(n: number, overrides: Partial<Schemas["Sale"]> = {}): Schemas["Sale"] {
  return {
    id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
    member: { id: "m1", name: `Buyer ${String(n).padStart(2, "0")}`, email: `buyer${n}@example.com` },
    location_id: "loc-1",
    channel: "desk",
    occurrence: null,
    booking_id: null,
    booking_ids: [],
    attendees: [],
    currency: "MYR",
    total_minor: 22000,
    paid_minor: 22000,
    balance_minor: 0,
    payment_status: "paid",
    fulfilled: true,
    renewal: false,
    refunded_minor: 0,
    voided_at: null,
    void_reason: null,
    refunds: [],
    purchased_at: "2026-11-20T10:00:00Z",
    line_item: { product_name: "Monthly unlimited", price_label: "Monthly", quantity: 1 } as Schemas["SaleLineItem"],
    payments: [{ id: "p1", amount_minor: 22000, currency: "MYR", method: "cash", provider: null, reference: null, received_at: "2026-11-20T10:00:00Z", refunded_minor: 0 }],
    fulfillment: null,
    ...overrides,
  } as Schemas["Sale"];
}
state.allowed = ["purchases:create"];
const rows = (count: number) => Array.from({ length: count }, (_, index) => sale(index + 1));
const render = (sales: Parameters<typeof SalesList>[0]["sales"], search: Parameters<typeof SalesList>[0]["search"] = {}) =>
  // Money uses a no-break space; compare with a plain one.
  renderToStaticMarkup(createElement(SalesList, { sales, search })).replaceAll("\u00a0", " ");

describe("SalesList", () => {
  test("shows the count, a row with its facts, the range, Filter, and Display", () => {
    const html = render({ ok: true, data: rows(3) });
    expect(html).toContain('<dt class="hero__label">sales</dt><dd class="hero__value">3</dd>');
    expect(html).toContain("Buyer 01");
    expect(html).toContain("Monthly unlimited");
    expect(html).toContain("Paid");
    expect(html).toContain("Fulfilled");
    expect(html).toContain("Cash");
    expect(html).toContain("RM 220.00");
    expect(html).toContain("1–3 of 3 sales");
    expect(html).toContain(">Filter<");
    expect(html).toContain("Display");
    expect(html).toContain('placeholder="Search member or product"');
  });

  test("shows the balance due under the total, and the refund when nothing is due", () => {
    const part = render({ ok: true, data: [sale(1, { payment_status: "partially_paid", fulfilled: false, paid_minor: 5000, balance_minor: 17000 })] });
    expect(part).toContain("Part paid");
    expect(part).toContain("RM 170.00 due");
    const refunded = render({ ok: true, data: [sale(1, { refunded_minor: 1000 })] });
    expect(refunded).toContain("RM 10.00 refunded");
  });

  test("a void sale shows Void and Unfulfilled, and no method", () => {
    const html = render({ ok: true, data: [sale(1, { payment_status: "void", fulfilled: false, voided_at: "2026-11-20T11:00:00Z", payments: [] })] });
    expect(html).toContain("Void");
    expect(html).toContain("Unfulfilled");
    expect(html).toContain('data-void="true"');
    expect(html).toContain(">—<");
  });

  test("filters from the URL show as chips and narrow the rows", () => {
    const data = [sale(1), sale(2, { payment_status: "unpaid", fulfilled: false, paid_minor: 0, balance_minor: 22000, payments: [] })];
    const html = render({ ok: true, data }, { payment: "unpaid" });
    expect(html).toContain("Payment");
    expect(html).toContain("Buyer 02");
    expect(html).not.toContain("Buyer 01");
    // A filter hides the count of all sales.
    expect(html).not.toContain("hero__stat");
  });

  test("pages the rows 50 at a time, and at Rails' 100 limit says more may exist", () => {
    const html = render({ ok: true, data: rows(100) });
    expect(html).toContain('<dd class="hero__value">100+</dd>');
    expect(html).toContain("1–50 of 100 sales shown");
    expect(html).toContain("Buyer 50");
    expect(html).not.toContain("Buyer 51");
  });

  test("says so when there are no sales, and when a search or filter matches none", () => {
    expect(render({ ok: true, data: [] })).toContain("No sales yet");
    const none = render({ ok: true, data: rows(2) }, { q: "zzz" });
    expect(none).toContain("No sales match “zzz”");
    expect(none).toContain("Clear search");
    const filtered = render({ ok: true, data: rows(2) }, { payment: "unpaid" });
    expect(filtered).toContain("No sales match these filters");
    expect(filtered).toContain("Clear filters");
  });

  test("a failed load shows the failure, and not an empty list", () => {
    const html = render({ ok: false, error: { status: 503, code: "api_unreachable", message: "Rails did not answer." } });
    expect(html).toContain("Sales did not load");
    expect(html).not.toContain("No sales yet");
  });
});
