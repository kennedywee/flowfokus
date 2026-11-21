import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import {
  chartFor,
  fillRate,
  groupByWeek,
  programSessions,
  spotsText,
  splitSessions,
  waysToBook,
  weekLabel,
  weekStart,
} from "./sessions";

type Occurrence = Schemas["Occurrence"];
const TZ = "Asia/Kuala_Lumpur";

/** A session at 07:00 gym time on `day`, one hour long. */
function session(id: string, day: string, overrides: Partial<Occurrence> = {}): Occurrence {
  const starts = new Date(`${day}T07:00:00+08:00`);
  return {
    id,
    program_id: "p1",
    starts_at: starts.toISOString(),
    ends_at: new Date(starts.getTime() + 3_600_000).toISOString(),
    capacity: 12,
    spots_taken: 6,
    spots_left: 6,
    bookable: true,
    cancelled_at: null,
    cancel_reason: null,
    ...overrides,
  };
}

// Thursday 5 November 2026, 06:40 at the gym.
const NOW = new Date("2026-11-05T06:40:00+08:00").getTime();

describe("the sessions of a program", () => {
  test("merges the program's own times with the schedule and keeps one copy of each", () => {
    const own = [session("b", "2026-11-05", { spots_taken: 9 }), session("c", "2026-11-06")];
    const history = [
      { ...session("a", "2026-11-03"), program: { id: "p1" } },
      { ...session("b", "2026-11-05", { spots_taken: 1 }), program: { id: "p1" } },
      { ...session("z", "2026-11-04"), program: { id: "other" } },
    ] as Schemas["ScheduleEntry"][];
    const merged = programSessions(own, history, "p1");
    expect(merged.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(merged[1]?.spots_taken).toBe(9);
    expect(programSessions(own, null, "p1").map((item) => item.id)).toEqual(["b", "c"]);
  });

  test("splits upcoming from past, with the past newest first", () => {
    const all = [session("a", "2026-11-02"), session("b", "2026-11-03"), session("c", "2026-11-05"), session("d", "2026-11-06")];
    const { upcoming, past } = splitSessions(all, NOW);
    expect(upcoming.map((item) => item.id)).toEqual(["c", "d"]);
    expect(past.map((item) => item.id)).toEqual(["b", "a"]);
  });

  test("groups by week from Monday", () => {
    expect(weekStart("2026-11-05")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
    const weeks = groupByWeek([session("a", "2026-11-05"), session("b", "2026-11-08"), session("c", "2026-11-09")], TZ);
    expect(weeks.map((week) => [week.week, week.sessions.length])).toEqual([
      ["2026-11-02", 2],
      ["2026-11-09", 1],
    ]);
    expect(weekLabel("2026-11-02")).toBe("Week of 2 Nov");
  });

  test("writes the spots beside the stack", () => {
    expect(spotsText(session("a", "2026-11-05", { spots_taken: 11 }))).toBe("11 of 12");
    expect(spotsText(session("a", "2026-11-05", { spots_taken: 12 }))).toBe("Full");
    expect(spotsText(session("a", "2026-11-05", { cancelled_at: "2026-11-01T00:00:00Z" }))).toBe("Cancelled");
  });
});

describe("the fill rate", () => {
  test("is spots taken over spots offered for sessions that ended in the last four weeks", () => {
    const all = [
      session("old", "2026-09-01", { spots_taken: 12 }),
      session("a", "2026-10-30", { spots_taken: 6 }),
      session("b", "2026-11-03", { spots_taken: 12 }),
      session("gone", "2026-11-04", { spots_taken: 0, cancelled_at: "2026-11-01T00:00:00Z" }),
      session("next", "2026-11-06", { spots_taken: 12 }),
    ];
    expect(fillRate(all, NOW, TZ, true)).toEqual({ percent: 75, sessions: 2 });
  });

  test("is left out when the history is missing or nothing qualifies", () => {
    expect(fillRate([session("a", "2026-11-03")], NOW, TZ, false)).toBeNull();
    expect(fillRate([session("a", "2026-11-06")], NOW, TZ, true)).toBeNull();
  });
});

describe("the chart", () => {
  test("has 38 days with today in the eighth slot and a label on each Monday", () => {
    const chart = chartFor([session("a", "2026-11-05"), session("b", "2026-11-06")], NOW, TZ);
    expect(chart?.days).toHaveLength(38);
    expect(chart?.days[chart.todayIndex]?.day).toBe("2026-11-05");
    expect(chart?.days[0]?.day).toBe("2026-10-29");
    expect(chart?.days[37]?.day).toBe("2026-12-05");
    expect(chart?.ticks.map((tick) => tick.label)).toEqual(["2 Nov", "9 Nov", "16 Nov", "23 Nov", "30 Nov"]);
  });

  test("puts each session in its day, leaves out sessions beyond the window, and keeps the last live one", () => {
    const sessions = [
      session("early", "2026-10-01"),
      session("a", "2026-11-05"),
      session("b", "2026-11-05", { cancelled_at: "2026-11-01T00:00:00Z" }),
      session("c", "2026-12-20"),
      session("d", "2026-12-21", { cancelled_at: "2026-11-01T00:00:00Z" }),
    ];
    const chart = chartFor(sessions, NOW, TZ);
    expect(chart?.days[7]?.sessions.map((item) => item.id)).toEqual(["a", "b"]);
    expect(chart?.days.flatMap((day) => day.sessions).map((item) => item.id)).toEqual(["a", "b"]);
    expect(chart?.last?.id).toBe("c");
    expect(chart?.firstCancelled).toBe("b");
  });

  test("is null when no session falls in the window", () => {
    expect(chartFor([session("far", "2026-12-20")], NOW, TZ)).toBeNull();
    expect(chartFor([], NOW, TZ)).toBeNull();
  });
});

describe("ways to book", () => {
  test("lists memberships, then passes, then tickets by name", () => {
    const price = (label: string, amount: number, available = true) => ({
      id: label,
      label,
      amount_minor: amount,
      currency: "MYR",
      duration_days: null,
      available,
      archived_at: null,
    });
    const ways = waysToBook(
      {
        accepted_by: [
          { id: "p", name: "10-class pass", kind: "pass" },
          { id: "m", name: "Monthly unlimited", kind: "membership" },
        ],
        ticket: { product_id: "t", prices: [price("Member guest", 2500), price("Drop-in", 3500)] },
      },
      (item) => `RM ${(item.amount_minor / 100).toFixed(2)}`,
    );
    expect(ways.map((way) => [way.name, way.type, way.price])).toEqual([
      ["Monthly unlimited", "Membership", "Included"],
      ["10-class pass", "Pass", "1 credit"],
      ["Drop-in", "Ticket", "RM 35.00"],
      ["Member guest", "Ticket", "RM 25.00"],
    ]);
    expect(ways[2]?.ticket?.id).toBe("Drop-in");
    expect(waysToBook({ accepted_by: [], ticket: null }, () => "")).toEqual([]);
  });
});
