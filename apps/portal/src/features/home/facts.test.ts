import { describe, expect, test } from "bun:test";
import { formatMoney, type Schemas } from "@flowfokus/api";
import {
  attentionItems,
  bookingsText,
  checkInsLine,
  checkInsText,
  dueLine,
  nameList,
  salesText,
  setupSteps,
  todayLabel,
  todaysSessions,
  upNext,
  upNextCount,
} from "./facts";

const TZ = "Asia/Kuala_Lumpur";
// Intl puts a no-break space after "RM", so the tests format amounts the same way.
const rm = (minor: number) => formatMoney(minor, "MYR");

function entry(id: string, startsAt: string, endsAt: string, over: Partial<Schemas["ScheduleEntry"]> = {}): Schemas["ScheduleEntry"] {
  return {
    id,
    program_id: "p1",
    starts_at: startsAt,
    ends_at: endsAt,
    capacity: 12,
    spots_taken: 4,
    spots_left: 8,
    bookable: true,
    cancelled_at: null,
    cancel_reason: null,
    program: { id: "p1", name: "HIIT 30", kind: "group_class", location_id: "l1", host_name: null, published: true },
    ...over,
  };
}

// 12:00 on Wed 4 Nov in Kuala Lumpur.
const NOW = new Date("2026-11-04T04:00:00Z");
// 07:00, 12:30, 18:00 on 4 Nov, and 07:00 on 5 Nov, local time.
const early = entry("early", "2026-11-03T23:00:00Z", "2026-11-04T00:00:00Z");
const lunch = entry("lunch", "2026-11-04T04:30:00Z", "2026-11-04T05:00:00Z", { capacity: 14, spots_taken: 9 });
const evening = entry("evening", "2026-11-04T10:00:00Z", "2026-11-04T11:00:00Z", {
  cancelled_at: "2026-11-04T01:00:00Z",
  cancel_reason: "Coach unwell",
});
const tomorrow = entry("tomorrow", "2026-11-04T23:00:00Z", "2026-11-05T00:00:00Z");

describe("today", () => {
  test("names the day in the gym's time zone", () => {
    expect(todayLabel(TZ, NOW)).toBe("Wednesday 4 Nov");
    // 23:30 UTC on 3 Nov is already 4 Nov in Kuala Lumpur.
    expect(todayLabel(TZ, new Date("2026-11-03T23:30:00Z"))).toBe("Wednesday 4 Nov");
  });

  test("keeps only today's sessions", () => {
    expect(todaysSessions([early, lunch, evening, tomorrow], TZ, NOW).map((item) => item.id)).toEqual(["early", "lunch", "evening"]);
  });
});

describe("up next", () => {
  test("skips sessions that ended and keeps cancelled ones", () => {
    expect(upNext([early, lunch, evening], NOW).map((item) => item.id)).toEqual(["lunch", "evening"]);
  });

  test("shows at most the limit", () => {
    expect(upNext([lunch, evening], NOW, 1).map((item) => item.id)).toEqual(["lunch"]);
  });

  test("counts what shows against the day", () => {
    expect(upNextCount(4, 9)).toBe("4 of 9 today");
    expect(upNextCount(3, 3)).toBe("3 today");
  });
});

describe("bookings", () => {
  test("adds booked spots in sessions that run", () => {
    expect(bookingsText([early, lunch, evening])).toBe("13 of 26 spots");
  });

  test("is empty without running sessions", () => {
    expect(bookingsText([])).toBeNull();
    expect(bookingsText([evening])).toBeNull();
  });
});

describe("check-ins", () => {
  test("counts every attempt and names denials", () => {
    expect(checkInsText({ granted: 83, denied: 3 })).toBe("86 · 3 denied");
    expect(checkInsText({ granted: 0, denied: 0 })).toBe("0");
    expect(checkInsLine({ granted: 1, denied: 0 })).toBe("1 check-in");
    expect(checkInsLine({ granted: 83, denied: 3 })).toBe("86 check-ins");
  });
});

describe("needs attention", () => {
  const none = { unpaid_sale_count: 0, awaiting_fulfillment_count: 0 };

  test("lists only counts above zero", () => {
    expect(attentionItems(none, NOW)).toEqual([]);
    expect(attentionItems({ unpaid_sale_count: 4, awaiting_fulfillment_count: 1 }, NOW)).toEqual([
      { kind: "balance_due", title: "4 sales with a balance due" },
      { kind: "unfulfilled", title: "1 paid sale unfulfilled" },
    ]);
  });

  test("adds the amount due, the oldest sale, and who waits, for roles that see money", () => {
    const items = attentionItems(
      {
        unpaid_sale_count: 4,
        awaiting_fulfillment_count: 5,
        currency: "MYR",
        money: {
          sales_today: { count: 0, total_minor: 0 },
          collected_today_minor: 0,
          payments_today: [],
          due: { total_minor: 64000, oldest_sale: { id: "s1", purchased_at: "2026-10-01T04:00:00Z" } },
          awaiting_fulfillment: [
            { sale_id: "s2", member_name: "Ben Lee" },
            { sale_id: "s3", member_name: "Aina Zul" },
            { sale_id: "s4", member_name: "Priya Nair" },
          ],
        },
      },
      NOW,
    );
    expect(items).toEqual([
      { kind: "balance_due", title: "4 sales with a balance due", line: `${rm(64000)} · oldest 34 days` },
      { kind: "unfulfilled", title: "5 paid sales unfulfilled", line: "Ben Lee, Aina Zul, Priya Nair, and 2 more" },
    ]);
  });

  test("names memberships that end soon", () => {
    expect(attentionItems({ ...none, memberships_ending_count: 1 }, NOW)).toEqual([
      { kind: "ending", title: "1 membership ends in the next 7 days" },
    ]);
    expect(attentionItems({ ...none, memberships_ending_count: 3 }, NOW)[0]?.title).toBe("3 memberships end in the next 7 days");
  });

  test("gives the oldest sale's age in whole days", () => {
    const due = (purchased_at: string) => ({ total_minor: 12000, oldest_sale: { id: "s1", purchased_at } });
    expect(dueLine(due("2026-11-04T01:00:00Z"), "MYR", NOW)).toBe(`${rm(12000)} · oldest today`);
    expect(dueLine(due("2026-11-03T03:00:00Z"), "MYR", NOW)).toBe(`${rm(12000)} · oldest 1 day`);
    expect(dueLine({ total_minor: 12000, oldest_sale: null }, "MYR", NOW)).toBe(`${rm(12000)}`);
  });

  test("joins names and counts the rest", () => {
    expect(nameList(["Ben"], 1)).toBe("Ben");
    expect(nameList(["Ben", "Aina"], 2)).toBe("Ben and Aina");
    expect(nameList(["Ben", "Aina", "Priya"], 3)).toBe("Ben, Aina, and Priya");
    expect(nameList(["Ben", "Aina"], 3)).toBe("Ben, Aina, and 1 more");
  });
});

describe("money today", () => {
  test("gives the sales total with the count", () => {
    expect(salesText({ count: 2, total_minor: 20000 }, "MYR")).toBe(`${rm(20000)} · 2 sales`);
    expect(salesText({ count: 1, total_minor: 12000 }, "MYR")).toBe(`${rm(12000)} · 1 sale`);
    expect(salesText({ count: 0, total_minor: 0 }, "MYR")).toBe(`${rm(0)}`);
  });
});

describe("first run", () => {
  test("lists the steps until every one is done", () => {
    expect(setupSteps(undefined)).toBeNull();
    expect(setupSteps({ location: true, product: true, member: true, sale: true })).toBeNull();
    expect(setupSteps({ location: true, product: false, member: false, sale: false })).toEqual([
      { key: "location", title: "Add a location", done: true },
      { key: "product", title: "Add a product", done: false },
      { key: "member", title: "Add a member", done: false },
      { key: "sale", title: "Record a sale", done: false },
    ]);
  });
});
