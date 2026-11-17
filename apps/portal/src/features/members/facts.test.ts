import { describe, expect, test } from "bun:test";
import { formatMoney, type Schemas } from "@flowfokus/api";
import { deliveryFact, paymentFact, paymentMethods } from "../sales/facts";
import { balanceDue, formatSpan, memberActivity, orderPeriods, periodState, periodText, totalPaid } from "./facts";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-17T08:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

function period(starts: number, ends: number, revoked = false): Schemas["MembershipPeriod"] {
  return {
    id: `p-${starts}`,
    membership_id: "m",
    sale_id: "s",
    fulfillment_id: "f",
    starts_at: iso(starts),
    ends_at: iso(ends),
    revoked_at: revoked ? iso(NOW - HOUR) : null,
  };
}

function sale(overrides: Partial<Schemas["Sale"]> = {}): Schemas["Sale"] {
  return {
    id: "sale-1",
    member: { id: "member-1", name: "Mei Lim", email: "mei@example.com" },
    location_id: null,
    channel: "desk",
    occurrence: null,
    booking_id: null,
    booking_ids: [],
    attendees: [],
    currency: "MYR",
    total_minor: 20000,
    paid_minor: 20000,
    balance_minor: 0,
    payment_status: "paid",
    fulfilled: true,
    renewal: false,
    refunded_minor: 0,
    voided_at: null,
    void_reason: null,
    refunds: [],
    purchased_at: iso(NOW - 2 * DAY),
    line_item: { product_name: "Monthly unlimited" } as Schemas["SaleLineItem"],
    payments: [],
    fulfillment: null,
    ...overrides,
  };
}

function payment(method: Schemas["PaymentMethod"], id: string = method): Schemas["Payment"] {
  return { id, amount_minor: 10000, currency: "MYR", method, provider: null, reference: null, received_at: iso(NOW - DAY), refunded_minor: 0 };
}

describe("formatSpan", () => {
  test.each([
    [29 * DAY + 16 * HOUR + 5 * 60_000, "29d 16h"],
    [3 * DAY, "3d"],
    [5 * HOUR + 12 * 60_000, "5h 12m"],
    [8 * 60_000, "8m"],
    [20_000, "under 1m"],
    [-5, "under 1m"],
  ])("%p ms reads %p", (ms, text) => {
    expect(formatSpan(ms)).toBe(text);
  });
});

describe("membership periods", () => {
  test("a current period reports the share left and the time to its end", () => {
    const current = period(NOW - 10 * DAY, NOW + 20 * DAY);
    expect(periodState(current, NOW)).toEqual({ state: "current", left: 2 / 3 });
    expect(periodText(current, NOW, () => "")).toBe("Ends in 20d");
  });

  test("a revoked period is revoked even inside its dates", () => {
    expect(periodState(period(NOW - DAY, NOW + DAY, true), NOW).state).toBe("revoked");
  });

  test("upcoming and ended periods", () => {
    expect(periodText(period(NOW + 2 * DAY, NOW + 30 * DAY), NOW, () => "")).toBe("Starts in 2d");
    expect(periodText(period(NOW - 30 * DAY, NOW - DAY), NOW, () => "2 Nov")).toBe("Ended 2 Nov");
  });

  test("live periods come first, newest first", () => {
    const old = period(NOW - 60 * DAY, NOW - 30 * DAY);
    const current = period(NOW - 30 * DAY, NOW + DAY);
    const next = period(NOW + DAY, NOW + 31 * DAY);
    const { active, rest } = orderPeriods([old, current, next], NOW);
    expect(active).toEqual([next, current]);
    expect(rest).toEqual([old]);
  });
});

describe("sale facts", () => {
  test("payment and delivery stay separate facts", () => {
    const paidNotDelivered = sale({ fulfilled: false });
    expect(paymentFact(paidNotDelivered)).toEqual({ state: "paid", label: "Paid" });
    expect(deliveryFact(paidNotDelivered)).toEqual({ state: "waiting", label: "Not delivered" });
  });

  test("part paid, unpaid, and void come from Rails fields", () => {
    expect(paymentFact(sale({ payment_status: "partially_paid" })).label).toBe("Part paid");
    expect(paymentFact(sale({ payment_status: "unpaid" })).state).toBe("unpaid");
    expect(paymentFact(sale({ voided_at: iso(NOW), payment_status: "paid" })).state).toBe("void");
  });

  test("a revoked delivery shows access revoked", () => {
    const revoked = sale({
      fulfillment: { revoked_at: iso(NOW) } as Schemas["Fulfillment"],
    });
    expect(deliveryFact(revoked)).toEqual({ state: "revoked", label: "Access revoked" });
  });

  test("payment methods are listed once each", () => {
    expect(paymentMethods(sale())).toBeNull();
    expect(paymentMethods(sale({ payments: [payment("cash", "a"), payment("cash", "b"), payment("bank_transfer")] }))).toBe(
      "Cash + Bank transfer",
    );
  });

  test("totals subtract refunds and skip void balances", () => {
    const sales = [
      sale({ paid_minor: 20000, refunded_minor: 5000 }),
      sale({ id: "s2", paid_minor: 0, balance_minor: 15000, payment_status: "unpaid" }),
      sale({ id: "s3", paid_minor: 0, balance_minor: 9000, voided_at: iso(NOW) }),
    ];
    expect(totalPaid(sales)).toEqual([formatMoney(15000, "MYR")]);
    expect(balanceDue(sales)).toEqual([formatMoney(15000, "MYR")]);
    expect(balanceDue([sale()])).toEqual([]);
  });
});

describe("memberActivity", () => {
  test("merges check-ins, sales, payments, and the join date, newest first", () => {
    const member = {
      id: "member-1",
      created_at: iso(NOW - 10 * DAY),
      entitlements: [{ id: "right-1", name: "8 gym visits" }],
      bookings: [],
    } as unknown as Schemas["MemberDetail"];
    const checkIns = [
      {
        id: "c1",
        location_id: "loc-1",
        result: "granted",
        denial_reason: null,
        entitlement_id: "right-1",
        override_reason: null,
        checked_in_at: iso(NOW - HOUR),
      },
      {
        id: "c2",
        location_id: "loc-1",
        result: "denied",
        denial_reason: "usage_limit_reached",
        entitlement_id: null,
        override_reason: null,
        checked_in_at: iso(NOW - 2 * HOUR),
      },
    ] as Schemas["CheckIn"][];
    const events = memberActivity(
      { member, sales: [sale({ payments: [payment("cash")] })], checkIns },
      () => "Bangsar",
    );
    expect(events.map((event) => event.text)).toEqual([
      "Checked in at Bangsar · 8 gym visits",
      "Check-in denied at Bangsar · No visits left this period",
      `Paid ${formatMoney(10000, "MYR")} by cash · Monthly unlimited`,
      `Sold Monthly unlimited · ${formatMoney(20000, "MYR")}`,
      "Added as a member",
    ]);
    expect(events[1]!.tone).toBe("critical");
  });
});
