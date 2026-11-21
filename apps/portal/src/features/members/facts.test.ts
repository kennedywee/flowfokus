import { describe, expect, test } from "bun:test";
import { formatMoney, type Schemas } from "@flowfokus/api";
import { fulfillmentFact, paymentFact, paymentMethods } from "../sales/facts";
import { balanceDue, formatSpan, holdRows, memberActivity, orderPeriods, periodState, periodText, saleMarks, totalPaid, visibleHolds } from "./facts";

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
  test("payment and fulfillment stay separate facts", () => {
    const paidNotFulfilled = sale({ fulfilled: false });
    expect(paymentFact(paidNotFulfilled)).toEqual({ state: "paid", label: "Paid" });
    expect(fulfillmentFact(paidNotFulfilled)).toEqual({ state: "waiting", label: "Unfulfilled" });
  });

  test("part paid, unpaid, and void come from Rails fields", () => {
    expect(paymentFact(sale({ payment_status: "partially_paid" })).label).toBe("Part paid");
    expect(paymentFact(sale({ payment_status: "unpaid" })).state).toBe("unpaid");
    expect(paymentFact(sale({ voided_at: iso(NOW), payment_status: "paid" })).state).toBe("void");
  });

  test("a revoked fulfillment shows access revoked", () => {
    const revoked = sale({
      fulfillment: { revoked_at: iso(NOW) } as Schemas["Fulfillment"],
    });
    expect(fulfillmentFact(revoked)).toEqual({ state: "revoked", label: "Access revoked" });
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
  test("merges sales, payments, and the join date, newest first", () => {
    const member = {
      id: "member-1",
      created_at: iso(NOW - 10 * DAY),
      entitlements: [{ id: "right-1", name: "8 gym visits" }],
      bookings: [],
    } as unknown as Schemas["MemberDetail"];
    const events = memberActivity(
      { member, sales: [sale({ payments: [payment("cash")] })] },
      () => "Bangsar",
    );
    expect(events.map((event) => event.text)).toEqual([
      `Paid ${formatMoney(10000, "MYR")} by cash · Monthly unlimited`,
      `Sold Monthly unlimited · ${formatMoney(20000, "MYR")}`,
      "Added as a member",
    ]);
  });
});

describe("holds", () => {
  const shortDate = (at: string) => at.slice(5, 10);
  const where = (id: string | null) => (id === null ? "All locations" : "Bangsar");
  function right(overrides: Partial<Schemas["Entitlement"]> = {}): Schemas["Entitlement"] {
    return {
      id: "r1",
      kind: "program_access",
      name: "10 group classes",
      starts_at: iso(NOW - DAY),
      ends_at: iso(NOW + 60 * DAY),
      location_id: null,
      usage_limit: 10,
      used_count: 7,
      remaining: 3,
      active: true,
      program_ids: [],
      program_kind: null,
      occurrence_id: null,
      ...overrides,
    };
  }
  const member = (periods: Schemas["MembershipPeriod"][], entitlements: Schemas["Entitlement"][]) =>
    ({ membership: { id: "ms", created_at: iso(NOW), periods }, entitlements, bookings: [] }) as unknown as Schemas["MemberDetail"];

  test("a live period, a counted right, and an ended period make three rows in order", () => {
    const rows = holdRows(
      member([period(NOW - 90 * DAY, NOW - 60 * DAY), period(NOW - 10 * DAY, NOW + 20 * DAY)], [right()]),
      [sale({ id: "s" })],
      NOW,
      shortDate,
      where,
    );
    expect(rows.map((row) => [row.title, row.live])).toEqual([
      ["Monthly unlimited", true],
      ["10 group classes", true],
      ["Monthly unlimited", false],
    ]);
    expect(rows[0]!.status).toMatchObject({ kind: "time", tone: "good", text: "Ends in 20d" });
    expect(rows[1]!.status).toEqual({ kind: "credit", left: 3, total: 10 });
    expect(rows[2]!.status).toMatchObject({ kind: "time", tone: "neutral" });
  });

  test("an unlimited right says so, and a right that has not started says when", () => {
    const rows = holdRows(
      member([], [right({ usage_limit: null, remaining: null, kind: "gym_access", name: "Gym access" }), right({ id: "r2", active: false, starts_at: iso(NOW + 3 * DAY) })]),
      [],
      NOW,
      shortDate,
      where,
    );
    expect(rows[0]!.status).toEqual({ kind: "text", text: "Unlimited visits" });
    expect(rows[1]!.status).toMatchObject({ kind: "time", text: expect.stringContaining("Starts") });
  });

  test("a revoked period is critical and says Revoked", () => {
    const rows = holdRows(member([period(NOW - DAY, NOW + DAY, true)], []), [], NOW, shortDate, where);
    expect(rows[0]!.status).toMatchObject({ tone: "critical", text: "Revoked" });
    expect(rows[0]!.title).toBe("Membership period");
  });

  test("with nothing live the list shows the latest period only", () => {
    const rows = holdRows(member([period(NOW - 90 * DAY, NOW - 60 * DAY), period(NOW - 60 * DAY, NOW - 30 * DAY)], []), [], NOW, shortDate, where);
    expect(visibleHolds(rows)).toHaveLength(1);
    expect(visibleHolds(rows)[0]!.status).toMatchObject({ kind: "time" });
  });
});

describe("saleMarks", () => {
  test("keeps payment and fulfillment apart, with Rails words", () => {
    expect(saleMarks(sale())).toEqual({
      payment: { kind: "paid", tone: "good", label: "Paid" },
      fulfillment: { kind: "fulfilled", tone: "good", label: "Fulfilled" },
    });
    const part = saleMarks(sale({ payment_status: "partially_paid", fulfilled: false }));
    expect(part.payment).toMatchObject({ kind: "partlyPaid", tone: "warning", label: "Part paid" });
    expect(part.fulfillment).toMatchObject({ kind: "unfulfilled", tone: "neutral" });
  });
});
