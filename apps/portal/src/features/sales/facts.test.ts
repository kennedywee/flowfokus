import { describe, expect, test } from "bun:test";
import { formatMoney, type Permission, type Schemas } from "@flowfokus/api";
import {
  factCounts,
  filterFromSearch,
  filterSales,
  readSalesSearch,
  refundablePayments,
  saleActions,
  saleActivity,
  salesRange,
  shortSaleDate,
} from "./facts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-17T08:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const TZ = "Asia/Kuala_Lumpur";

function sale(overrides: Partial<Schemas["Sale"]> = {}): Schemas["Sale"] {
  return {
    id: "sale-1",
    member: { id: "member-1", name: "Mei Lim", email: "mei@example.com" },
    location_id: "loc-1",
    channel: "desk",
    occurrence: null,
    booking_id: null,
    booking_ids: [],
    attendees: [],
    currency: "MYR",
    total_minor: 20000,
    paid_minor: 0,
    balance_minor: 20000,
    payment_status: "unpaid",
    fulfilled: false,
    renewal: false,
    refunded_minor: 0,
    voided_at: null,
    void_reason: null,
    refunds: [],
    purchased_at: iso(NOW - 2 * DAY),
    line_item: { product_name: "Monthly unlimited", price_label: "30 days" } as Schemas["SaleLineItem"],
    payments: [],
    fulfillment: null,
    ...overrides,
  };
}

function payment(id: string, amount: number, refunded = 0, at = NOW - DAY): Schemas["Payment"] {
  return { id, amount_minor: amount, currency: "MYR", method: "cash", provider: null, reference: null, received_at: iso(at), refunded_minor: refunded };
}

function fulfillment(overrides: Partial<Schemas["Fulfillment"]> = {}): Schemas["Fulfillment"] {
  return {
    id: "f-1",
    sale_line_item_id: "line-1",
    membership_id: null,
    membership_period: null,
    fulfilled_at: iso(NOW - HOUR),
    early: false,
    early_reason: null,
    unpaid_minor: 0,
    revoked_at: null,
    revoke_reason: null,
    ...overrides,
  };
}

const paid = sale({ id: "paid", paid_minor: 20000, balance_minor: 0, payment_status: "paid", payments: [payment("p1", 20000)] });
const delivered = sale({ ...paid, id: "delivered", fulfilled: true, fulfillment: fulfillment() });
const partial = sale({ id: "partial", paid_minor: 5000, balance_minor: 15000, payment_status: "partially_paid", member: { id: "m2", name: "Arif Hakim", email: "arif@example.com" } });
const voided = sale({ id: "void", voided_at: iso(NOW - HOUR), void_reason: "Wrong member", payment_status: "void" });
const all = [sale(), paid, delivered, partial, voided];

describe("the list URL", () => {
  test("keeps known filter values in a fixed order and drops the rest", () => {
    expect(readSalesSearch({ payment: "paid,bogus,unpaid", delivery: "waiting", q: "  mei " })).toEqual({
      payment: "unpaid,paid",
      delivery: "waiting",
      q: "mei",
    });
    expect(readSalesSearch({ payment: 3, delivery: "none" })).toEqual({});
  });

  test("older view links become the same filters", () => {
    expect(readSalesSearch({ view: "due" })).toEqual({ payment: "unpaid,partial" });
    expect(readSalesSearch({ view: "deliver" })).toEqual({ payment: "paid", delivery: "waiting" });
  });
});

describe("filterSales", () => {
  test("payment and delivery filter separately: paid does not mean delivered", () => {
    const paidNotDelivered = filterSales(all, filterFromSearch({ payment: "paid", delivery: "waiting" }));
    expect(paidNotDelivered.map((item) => item.id)).toEqual(["paid"]);
  });

  test("values within one fact match any; void sales are never 'not delivered'", () => {
    const due = filterSales(all, filterFromSearch({ payment: "unpaid,partial" }));
    expect(due.map((item) => item.id)).toEqual(["sale-1", "partial"]);
    const waiting = filterSales(all, filterFromSearch({ delivery: "waiting" }));
    expect(waiting.map((item) => item.id)).not.toContain("void");
  });

  test("search matches member name, email, and item, ignoring case", () => {
    const none = filterFromSearch({});
    expect(filterSales(all, none, "ARIF").map((item) => item.id)).toEqual(["partial"]);
    expect(filterSales(all, none, "arif@").map((item) => item.id)).toEqual(["partial"]);
    expect(filterSales(all, none, "monthly")).toHaveLength(all.length);
  });

  test("counts give one payment and one delivery state per sale", () => {
    const counts = factCounts(all);
    expect([counts.unpaid, counts.partial, counts.paid, counts.void]).toEqual([1, 1, 2, 1]);
    expect([counts.waiting, counts.delivered, counts.none]).toEqual([3, 1, 1]);
  });

  test("the footer counts sales", () => {
    expect(salesRange(0, 1, 1)).toBe("1 sale");
    expect(salesRange(50, 50, 212)).toBe("51–100 of 212 sales");
  });
});

describe("shortSaleDate", () => {
  const now = new Date(NOW);
  test("today and yesterday name the day and give the time", () => {
    expect(shortSaleDate(iso(NOW - HOUR), TZ, now)).toMatch(/^Today /);
    expect(shortSaleDate(iso(NOW - DAY), TZ, now)).toMatch(/^Yesterday /);
  });
  test("older dates give the day, and the year only outside this year", () => {
    expect(shortSaleDate("2026-11-02T04:00:00Z", TZ, now)).toBe("2 Nov");
    expect(shortSaleDate("2025-11-02T04:00:00Z", TZ, now)).toBe("2 Nov 2025");
  });
});

describe("saleActions", () => {
  const everything = () => true;
  const only = (...allowed: Permission[]) => (permission: Permission) => allowed.includes(permission);

  test("an unpaid sale takes a payment; delivery is early only with purchases:fulfill_unpaid", () => {
    expect(saleActions(sale(), everything)).toMatchObject({ pay: true, deliver: "early", refund: false, void: true, revoke: false });
    expect(saleActions(sale(), only("purchases:fulfill")).deliver).toBe("blocked");
    expect(saleActions(sale(), only("payments:create")).deliver).toBeNull();
  });

  test("a paid sale delivers; money kept stops a void", () => {
    expect(saleActions(paid, everything)).toMatchObject({ pay: false, deliver: "ready", refund: true, void: false });
  });

  test("a delivered sale can be revoked, once", () => {
    expect(saleActions(delivered, everything)).toMatchObject({ deliver: null, revoke: true });
    const revoked = sale({ ...delivered, fulfillment: fulfillment({ revoked_at: iso(NOW) }) });
    expect(saleActions(revoked, everything).revoke).toBe(false);
  });

  test("a void sale takes no payment, delivery, or second void", () => {
    expect(saleActions(voided, everything)).toMatchObject({ pay: false, deliver: null, void: false });
  });

  test("each action needs its permission", () => {
    expect(saleActions(paid, only())).toEqual({ pay: false, deliver: null, refund: false, void: false, revoke: false });
  });

  test("only payments with money left can be refunded", () => {
    const mixed = sale({ payments: [payment("a", 10000, 10000), payment("b", 10000, 2500)] });
    expect(refundablePayments(mixed).map((item) => item.id)).toEqual(["b"]);
  });
});

describe("saleActivity", () => {
  test("lists what Rails recorded, newest first", () => {
    const refunded = sale({
      ...delivered,
      refunds: [{ id: "r1", payment_id: "p1", amount_minor: 5000, currency: "MYR", reason: "Moving away", refunded_at: iso(NOW - HOUR / 2) }],
      fulfillment: fulfillment({ revoked_at: iso(NOW - HOUR / 4), revoke_reason: "Moving away" }),
    });
    expect(saleActivity(refunded).map((event) => event.text)).toEqual([
      "Access revoked · Moving away",
      `Refunded ${formatMoney(5000, "MYR")} · Moving away`,
      "Delivered",
      `Paid ${formatMoney(20000, "MYR")} by cash`,
      `Sold · ${formatMoney(20000, "MYR")}`,
    ]);
  });

  test("an early delivery and a void say so, with the reason", () => {
    const early = sale({ fulfillment: fulfillment({ early: true, early_reason: "Pays Friday", unpaid_minor: 20000 }), fulfilled: true });
    expect(saleActivity(early)[0]!.text).toBe(`Delivered before full payment · ${formatMoney(20000, "MYR")} was due · Pays Friday`);
    expect(saleActivity(voided)[0]).toMatchObject({ tone: "critical", text: "Voided · Wrong member" });
  });
});
