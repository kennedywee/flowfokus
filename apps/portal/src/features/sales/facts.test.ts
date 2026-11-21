import { describe, expect, test } from "bun:test";
import { formatMoney, type Permission, type Schemas } from "@flowfokus/api";
import {
  DEFAULT_SALE_COLUMNS,
  DEFAULT_SALE_SORT,
  activeFilters,
  factCounts,
  filterFromSearch,
  filterSales,
  isDefaultDisplay,
  readSalesSearch,
  refundablePayments,
  saleActions,
  saleActivity,
  salesFilterFields,
  searchFromFilters,
  shortSaleDate,
  sortSales,
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
const fulfilled = sale({ ...paid, id: "fulfilled", fulfilled: true, fulfillment: fulfillment() });
const partial = sale({ id: "partial", paid_minor: 5000, balance_minor: 15000, payment_status: "partially_paid", member: { id: "m2", name: "Arif Hakim", email: "arif@example.com" } });
const voided = sale({ id: "void", voided_at: iso(NOW - HOUR), void_reason: "Wrong member", payment_status: "void" });
const all = [sale(), paid, fulfilled, partial, voided];

describe("the list URL", () => {
  test("keeps known filter values in a fixed order and drops the rest", () => {
    expect(readSalesSearch({ payment: "paid,bogus,unpaid", fulfillment: "waiting", q: "  mei " })).toEqual({
      payment: "unpaid,paid",
      fulfillment: "waiting",
      q: "mei",
    });
    expect(readSalesSearch({ payment: 3, fulfillment: "none" })).toEqual({});
  });

  test("older view links become the same filters", () => {
    expect(readSalesSearch({ view: "due" })).toEqual({ payment: "unpaid,partial" });
    expect(readSalesSearch({ view: "deliver" })).toEqual({ payment: "paid", fulfillment: "waiting" });
  });

  test("older delivery links become the fulfillment filter", () => {
    expect(readSalesSearch({ delivery: "waiting,delivered" })).toEqual({ fulfillment: "waiting,fulfilled" });
    expect(readSalesSearch({ payment: "paid", delivery: "revoked" })).toEqual({ payment: "paid", fulfillment: "revoked" });
    expect(readSalesSearch({ fulfillment: "fulfilled", delivery: "waiting" })).toEqual({ fulfillment: "fulfilled" });
  });
});

describe("filterSales", () => {
  test("payment and fulfillment filter separately: paid does not mean fulfilled", () => {
    const paidNotFulfilled = filterSales(all, filterFromSearch({ payment: "paid", fulfillment: "waiting" }));
    expect(paidNotFulfilled.map((item) => item.id)).toEqual(["paid"]);
  });

  test("values within one fact match any; void sales are never 'unfulfilled'", () => {
    const due = filterSales(all, filterFromSearch({ payment: "unpaid,partial" }));
    expect(due.map((item) => item.id)).toEqual(["sale-1", "partial"]);
    const waiting = filterSales(all, filterFromSearch({ fulfillment: "waiting" }));
    expect(waiting.map((item) => item.id)).not.toContain("void");
  });

  test("search matches member name, email, and item, ignoring case", () => {
    const none = filterFromSearch({});
    expect(filterSales(all, none, "ARIF").map((item) => item.id)).toEqual(["partial"]);
    expect(filterSales(all, none, "arif@").map((item) => item.id)).toEqual(["partial"]);
    expect(filterSales(all, none, "monthly")).toHaveLength(all.length);
  });

  test("counts give one payment and one fulfillment state per sale", () => {
    const counts = factCounts(all);
    expect([counts.unpaid, counts.partial, counts.paid, counts.void]).toEqual([1, 1, 2, 1]);
    expect([counts.waiting, counts.fulfilled, counts.none]).toEqual([3, 1, 1]);
  });

  test("the filter bar offers Payment and Fulfillment with a count per value", () => {
    const fields = salesFilterFields(factCounts(all));
    expect(fields.map((field) => field.key)).toEqual(["payment", "fulfillment"]);
    expect(fields[0]!.options.map((option) => [option.value, option.count])).toEqual([
      ["unpaid", 1],
      ["partial", 1],
      ["paid", 2],
      ["void", 1],
    ]);
  });

  test("chips round-trip through the URL, payment first", () => {
    const filter = filterFromSearch({ fulfillment: "waiting", payment: "unpaid,partial" });
    const chips = activeFilters(filter);
    expect(chips.map((chip) => [chip.field, chip.values])).toEqual([
      ["payment", ["unpaid", "partial"]],
      ["fulfillment", ["waiting"]],
    ]);
    expect(searchFromFilters(chips, "mei")).toEqual({ payment: "unpaid,partial", fulfillment: "waiting", q: "mei" });
    expect(searchFromFilters([], undefined)).toEqual({});
  });

  test("a chip flipped to 'is not' keeps its values and sets the _not param", () => {
    const flipped = [{ field: "payment", values: ["paid"], negated: true }];
    expect(searchFromFilters(flipped, undefined)).toEqual({ payment: "paid", payment_not: true });
    const every = [{ field: "fulfillment", values: ["waiting", "fulfilled", "revoked"], negated: true }];
    expect(searchFromFilters(every, undefined)).toEqual({ fulfillment: "waiting,fulfilled,revoked", fulfillment_not: true });
    // A chip with no values is not a filter, so it leaves no param.
    expect(searchFromFilters([{ field: "payment", values: [], negated: true }], undefined)).toEqual({});
  });

  test("'is not' round-trips through the URL and the chips", () => {
    const search = readSalesSearch({ payment: "paid,void", payment_not: true, fulfillment: "fulfilled" });
    expect(search).toEqual({ payment: "paid,void", payment_not: true, fulfillment: "fulfilled" });
    const chips = activeFilters(filterFromSearch(search));
    expect(chips.map((chip) => [chip.field, chip.negated])).toEqual([
      ["payment", true],
      ["fulfillment", false],
    ]);
    expect(searchFromFilters(chips, undefined)).toEqual(search);
  });
});

describe("'is not' filters", () => {
  const every = "unpaid,partial,paid,void";

  test("payment 'is not' every value shows no sale", () => {
    expect(filterSales(all, filterFromSearch({ payment: every, payment_not: true }))).toEqual([]);
    // The same values without the flag still show every sale.
    expect(filterSales(all, filterFromSearch({ payment: every }))).toHaveLength(all.length);
  });

  test("payment 'is not' one value leaves the others, void included", () => {
    const notPaid = filterSales(all, filterFromSearch({ payment: "paid", payment_not: true }));
    expect(notPaid.map((item) => item.id)).toEqual(["sale-1", "partial", "void"]);
    const notVoid = filterSales(all, filterFromSearch({ payment: "void", payment_not: true }));
    expect(notVoid.map((item) => item.id)).not.toContain("void");
  });

  test("fulfillment 'is not' keeps void sales, which are neither waiting nor fulfilled", () => {
    const notFulfilled = filterSales(all, filterFromSearch({ fulfillment: "fulfilled", fulfillment_not: true }));
    expect(notFulfilled.map((item) => item.id)).toEqual(["sale-1", "paid", "partial", "void"]);
    const notWaiting = filterSales(all, filterFromSearch({ fulfillment: "waiting", fulfillment_not: true }));
    expect(notWaiting.map((item) => item.id)).toEqual(["fulfilled", "void"]);
    const none = filterSales(all, filterFromSearch({ fulfillment: "waiting,fulfilled,revoked", fulfillment_not: true }));
    expect(none.map((item) => item.id)).toEqual(["void"]);
  });

  test("_not counts only with values, and never turns an old link negative", () => {
    expect(readSalesSearch({ payment_not: true })).toEqual({});
    expect(readSalesSearch({ payment: "bogus", payment_not: true })).toEqual({});
    expect(readSalesSearch({ delivery: "waiting", fulfillment_not: true })).toEqual({ fulfillment: "waiting" });
    expect(readSalesSearch({ view: "due", payment_not: true })).toEqual({ payment: "unpaid,partial" });
    expect(readSalesSearch({ view: "deliver", payment_not: true, fulfillment_not: true })).toEqual({ payment: "paid", fulfillment: "waiting" });
  });

  test("a link typed by hand may say payment_not=1 or payment_not=true", () => {
    expect(readSalesSearch({ payment: "paid", payment_not: "1" })).toEqual({ payment: "paid", payment_not: true });
    expect(readSalesSearch({ payment: "paid", payment_not: "true" })).toEqual({ payment: "paid", payment_not: true });
    expect(readSalesSearch({ payment: "paid", payment_not: "no" })).toEqual({ payment: "paid" });
  });

  test("old links without _not are 'is any of'", () => {
    expect(filterFromSearch(readSalesSearch({ payment: "unpaid,partial" }))).toMatchObject({ paymentNot: false, fulfillmentNot: false });
    expect(filterSales(all, filterFromSearch(readSalesSearch({ view: "due" }))).map((item) => item.id)).toEqual(["sale-1", "partial"]);
    expect(filterSales(all, filterFromSearch(readSalesSearch({ delivery: "delivered" }))).map((item) => item.id)).toEqual(["fulfilled"]);
  });
});

describe("sortSales", () => {
  const rows = [
    sale({ id: "a", member: { id: "m1", name: "Zoe", email: "z@x.com" }, total_minor: 100, purchased_at: iso(NOW - 3 * DAY) }),
    sale({ id: "b", member: { id: "m2", name: "álvaro", email: "a@x.com" }, total_minor: 300, purchased_at: iso(NOW - DAY) }),
    sale({ id: "c", member: { id: "m3", name: "Bea", email: "b@x.com" }, total_minor: 300, purchased_at: iso(NOW - 2 * DAY) }),
  ];
  const ids = (sort: Parameters<typeof sortSales>[1]) => sortSales(rows, sort).map((item) => item.id);

  test("date sorts by the moment of sale, newest first by default", () => {
    expect(ids(DEFAULT_SALE_SORT)).toEqual(["b", "c", "a"]);
    expect(ids({ column: "date", direction: "asc" })).toEqual(["a", "c", "b"]);
  });
  test("member sorts without regard to case or accents", () => {
    expect(ids({ column: "member", direction: "asc" })).toEqual(["b", "c", "a"]);
  });
  test("amount sorts by total, and a tie keeps the order Rails sent", () => {
    expect(ids({ column: "amount", direction: "desc" })).toEqual(["b", "c", "a"]);
    expect(ids({ column: "amount", direction: "asc" })).toEqual(["a", "b", "c"]);
  });
  test("reset is inert at the default sort and columns only", () => {
    expect(isDefaultDisplay(DEFAULT_SALE_SORT, DEFAULT_SALE_COLUMNS)).toBe(true);
    expect(isDefaultDisplay({ column: "member", direction: "asc" }, DEFAULT_SALE_COLUMNS)).toBe(false);
    expect(isDefaultDisplay(DEFAULT_SALE_SORT, { ...DEFAULT_SALE_COLUMNS, method: false })).toBe(false);
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

  test("an unpaid sale takes a payment; fulfillment is early only with purchases:fulfill_unpaid", () => {
    expect(saleActions(sale(), everything)).toMatchObject({ pay: true, fulfill: "early", refund: false, void: true, revoke: false });
    expect(saleActions(sale(), only("purchases:fulfill")).fulfill).toBe("blocked");
    expect(saleActions(sale(), only("payments:create")).fulfill).toBeNull();
  });

  test("a paid sale fulfills; money kept stops a void", () => {
    expect(saleActions(paid, everything)).toMatchObject({ pay: false, fulfill: "ready", refund: true, void: false });
  });

  test("a fulfilled sale can be revoked, once", () => {
    expect(saleActions(fulfilled, everything)).toMatchObject({ fulfill: null, revoke: true });
    const revoked = sale({ ...fulfilled, fulfillment: fulfillment({ revoked_at: iso(NOW) }) });
    expect(saleActions(revoked, everything).revoke).toBe(false);
  });

  test("a void sale takes no payment, fulfillment, or second void", () => {
    expect(saleActions(voided, everything)).toMatchObject({ pay: false, fulfill: null, void: false });
  });

  test("each action needs its permission", () => {
    expect(saleActions(paid, only())).toEqual({ pay: false, fulfill: null, refund: false, void: false, revoke: false });
  });

  test("only payments with money left can be refunded", () => {
    const mixed = sale({ payments: [payment("a", 10000, 10000), payment("b", 10000, 2500)] });
    expect(refundablePayments(mixed).map((item) => item.id)).toEqual(["b"]);
  });
});

describe("saleActivity", () => {
  test("lists what Rails recorded, newest first", () => {
    const refunded = sale({
      ...fulfilled,
      refunds: [{ id: "r1", payment_id: "p1", amount_minor: 5000, currency: "MYR", reason: "Moving away", refunded_at: iso(NOW - HOUR / 2) }],
      fulfillment: fulfillment({ revoked_at: iso(NOW - HOUR / 4), revoke_reason: "Moving away" }),
    });
    expect(saleActivity(refunded).map((event) => event.text)).toEqual([
      "Access revoked · Moving away",
      `Refunded ${formatMoney(5000, "MYR")} · Moving away`,
      "Fulfilled",
      `Paid ${formatMoney(20000, "MYR")} by cash`,
      `Sold · ${formatMoney(20000, "MYR")}`,
    ]);
  });

  test("an early fulfillment and a void say so, with the reason", () => {
    const early = sale({ fulfillment: fulfillment({ early: true, early_reason: "Pays Friday", unpaid_minor: 20000 }), fulfilled: true });
    expect(saleActivity(early)[0]!.text).toBe(`Fulfilled before full payment · ${formatMoney(20000, "MYR")} was due · Pays Friday`);
    expect(saleActivity(voided)[0]).toMatchObject({ tone: "critical", text: "Voided · Wrong member" });
  });
});
