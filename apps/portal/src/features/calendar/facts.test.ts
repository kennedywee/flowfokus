import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import {
  applyFilters,
  axisFor,
  blockLabel,
  blockStatus,
  firstItem,
  groupEntries,
  groupOf,
  hiddenParam,
  kindCounts,
  minutesOfDay,
  moveFocus,
  nowMinutes,
  placeColumn,
  rangeFor,
  rangeText,
  readCalendarSearch,
  stepDate,
  viewOf,
  weekDays,
  weekLabel,
  weekStart,
  type NavItem,
} from "./facts";

const TZ = "Asia/Kuala_Lumpur";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const NOW = new Date("2026-11-21T11:00:00Z"); // 19:00 in Kuala Lumpur

/** `at` is a local clock time on 2026-11-21 (UTC+8). */
function at(clock: string): string {
  return new Date(`2026-11-21T${clock}:00+08:00`).toISOString();
}

function entry(
  id: string,
  from: string,
  to: string,
  program: Partial<Schemas["ProgramSummary"]> = {},
  over: Partial<Schemas["ScheduleEntry"]> = {},
): Schemas["ScheduleEntry"] {
  return {
    id,
    program_id: program.id ?? A,
    starts_at: at(from),
    ends_at: at(to),
    capacity: 12,
    spots_taken: 3,
    spots_left: 9,
    bookable: true,
    cancelled_at: null,
    cancel_reason: null,
    program: { id: A, name: "Yoga Flow", kind: "group_class", location_id: "loc", host_name: "Daniel Wong", published: true, ...program },
    ...over,
  };
}

describe("calendar URL", () => {
  test("keeps valid values and drops the rest", () => {
    expect(readCalendarSearch({ date: "2026-11-21", view: "week", group: "program", program: `${A},bad,${B}`, hide: "event,class,nope" })).toEqual({
      date: "2026-11-21",
      view: "week",
      group: "program",
      program: `${A},${B}`,
      hide: "class,event",
    });
    expect(readCalendarSearch({ date: "21-11-2026", view: "month", group: "weird", program: "x", hide: "x" })).toEqual({});
    expect(readCalendarSearch({ date: "2026-13-45" })).toEqual({});
    expect(readCalendarSearch({ date: "2026-02-30" })).toEqual({});
    expect(readCalendarSearch({ date: "2026-04-31" })).toEqual({});
    expect(readCalendarSearch({ date: "2028-02-29" })).toEqual({ date: "2028-02-29" });
  });

  test("leaves out the defaults", () => {
    expect(readCalendarSearch({ view: "day", group: "host" })).toEqual({});
    expect(viewOf({})).toBe("day");
    expect(viewOf({ view: "week" })).toBe("week");
    expect(groupOf({})).toBe("host");
    expect(groupOf({ group: "none" })).toBe("none");
  });

  test("hiddenParam round-trips in kinds-row order", () => {
    expect(hiddenParam(["event", "group_class"])).toBe("class,event");
    expect(hiddenParam([])).toBeUndefined();
  });
});

describe("days", () => {
  test("the week starts on Monday", () => {
    expect(weekStart("2026-11-21")).toBe("2026-11-16"); // Saturday
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    expect(weekDays("2026-11-16")).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
  });

  test("asks Rails for one day or seven", () => {
    expect(rangeFor("day", "2026-11-21")).toEqual({ from: "2026-11-21", days: 1 });
    expect(rangeFor("week", "2026-11-21")).toEqual({ from: "2026-11-16", days: 7 });
  });

  test("previous and next step a day or a week", () => {
    expect(stepDate("day", "2026-11-30", 1)).toBe("2026-12-01");
    expect(stepDate("week", "2026-11-21", -1)).toBe("2026-11-14");
  });

  test("labels", () => {
    expect(rangeText("day", "2026-11-21")).toBe("Sat 21 Nov");
    expect(weekLabel("2026-11-16")).toBe("Mon 16 – Sun 22 Nov");
    expect(weekLabel("2026-11-30")).toBe("Mon 30 Nov – Sun 6 Dec");
  });
});

describe("filters", () => {
  const entries = [
    entry("c1", "07:00", "08:00"),
    entry("c2", "09:00", "10:00", { id: B, name: "HIIT" }),
    entry("a1", "09:00", "09:30", { id: B, name: "PT", kind: "appointment" }),
    entry("e1", "18:00", "20:00", { id: B, name: "Open day", kind: "event" }),
  ];

  test("counts each kind", () => {
    expect(kindCounts(entries)).toEqual({ group_class: 2, appointment: 1, event: 1 });
  });

  test("counts follow the program filter, shown follows the kinds that are on", () => {
    const { counts, shown } = applyFilters(entries, [B], ["event"]);
    expect(counts).toEqual({ group_class: 1, appointment: 1, event: 1 });
    expect(shown.map((item) => item.id)).toEqual(["c2", "a1"]);
  });

  test("with every kind off, nothing shows and the counts stay", () => {
    const { counts, shown } = applyFilters(entries, [], ["group_class", "appointment", "event"]);
    expect(shown).toEqual([]);
    expect(counts.group_class).toBe(2);
  });
});

describe("groups", () => {
  const entries = [
    entry("1", "07:00", "08:00", { id: A, name: "Yoga", host_name: "Sam" }),
    entry("2", "08:00", "09:00", { id: B, name: "HIIT", host_name: "sam " }),
    entry("3", "09:00", "10:00", { id: B, name: "HIIT", host_name: null }),
    entry("4", "10:00", "11:00", { id: A, name: "Yoga", host_name: "Alex" }),
  ];

  test("none is one group", () => {
    expect(groupEntries(entries, "none")).toHaveLength(1);
    expect(groupEntries([], "none")).toEqual([]);
  });

  test("host groups by name, ignoring case, with No host last", () => {
    const groups = groupEntries(entries, "host");
    expect(groups.map((group) => [group.label, group.entries.map((item) => item.id)])).toEqual([
      ["Alex", ["4"]],
      ["Sam", ["1", "2"]],
      ["No host", ["3"]],
    ]);
  });

  test("program groups by program, by name", () => {
    expect(groupEntries(entries, "program").map((group) => [group.label, group.entries.length])).toEqual([
      ["HIIT", 2],
      ["Yoga", 2],
    ]);
  });
});

describe("Day grid layout", () => {
  test("minutes are read in the gym's time zone", () => {
    expect(minutesOfDay(at("19:22"), TZ)).toBe(19 * 60 + 22);
  });

  test("sessions that do not overlap each take the full width", () => {
    const placed = placeColumn([entry("a", "07:00", "08:00"), entry("b", "08:00", "09:00")], TZ);
    expect(placed.map((item) => [item.lane, item.lanes])).toEqual([
      [0, 1],
      [0, 1],
    ]);
  });

  test("overlapping sessions share the width, and a later one reuses a free lane", () => {
    const placed = placeColumn(
      [entry("a", "07:00", "09:00"), entry("b", "07:30", "08:00"), entry("c", "08:00", "08:30"), entry("d", "10:00", "11:00")],
      TZ,
    );
    expect(placed.map((item) => [item.entry.id, item.lane, item.lanes])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 1, 2],
      ["d", 0, 1],
    ]);
  });

  test("a short session is drawn at least half an hour tall and cannot hide the next one", () => {
    const placed = placeColumn([entry("a", "07:00", "07:10"), entry("b", "07:20", "08:00")], TZ);
    expect(placed[0]!.end - placed[0]!.start).toBe(30);
    expect(placed.map((item) => item.lanes)).toEqual([2, 2]);
  });

  test("a session that runs past midnight stops at midnight", () => {
    const placed = placeColumn([entry("a", "23:30", "23:59", {}, { ends_at: new Date("2026-11-22T01:00:00+08:00").toISOString() })], TZ);
    expect(placed[0]!.end).toBe(24 * 60);
  });

  test("the axis is 06 to 22 and grows to hold a session outside it", () => {
    expect(axisFor(placeColumn([entry("a", "07:00", "08:00")], TZ))).toEqual({ start: 6, end: 22 });
    expect(axisFor(placeColumn([entry("a", "05:15", "06:00"), entry("b", "21:30", "22:45")], TZ))).toEqual({ start: 5, end: 23 });
  });

  test("now is known only on its own day", () => {
    expect(nowMinutes("2026-11-21", NOW, TZ)).toBe(19 * 60);
    expect(nowMinutes("2026-11-20", NOW, TZ)).toBeNull();
  });
});

describe("block text", () => {
  test("a class says how many are booked, an event how many are sold, an appointment booked or open", () => {
    expect(blockStatus(entry("a", "07:00", "08:00"), NOW)).toBe("3 of 12");
    expect(blockStatus(entry("a", "07:00", "08:00", { kind: "event" }, { capacity: 50, spots_taken: 41 }), NOW)).toBe("41 of 50 sold");
    expect(blockStatus(entry("a", "07:00", "08:00", { kind: "appointment" }, { capacity: 1, spots_taken: 0, spots_left: 1 }), NOW)).toBe("Open");
    expect(blockStatus(entry("a", "07:00", "08:00", { kind: "appointment" }, { capacity: 1, spots_taken: 1, spots_left: 0 }), NOW)).toBe("Booked");
  });

  test("cancelled gives the reason", () => {
    const cancelled = entry("a", "20:00", "21:00", {}, { cancelled_at: at("08:00"), cancel_reason: "Coach unwell" });
    expect(blockStatus(cancelled, NOW)).toBe("Cancelled · Coach unwell");
    expect(blockLabel(cancelled, TZ, "Group class", NOW)).toContain("cancelled, Coach unwell");
  });

  test("the label names the program, kind, time, host, and booking", () => {
    expect(blockLabel(entry("a", "19:00", "20:00", { host_name: null }, { spots_taken: 12, spots_left: 0 }), TZ, "Group class", NOW)).toBe(
      "Yoga Flow, Group class, 19:00 to 20:00, no host, 12 of 12 booked, full",
    );
  });
});

describe("keyboard", () => {
  // Day: three columns, one row. Column 0 has two sessions.
  const day: NavItem[] = [
    { id: "a", x: 0, y: 0, start: 100 },
    { id: "b", x: 0, y: 0, start: 200 },
    { id: "c", x: 1, y: 0, start: 190 },
    { id: "d", x: 2, y: 0, start: 500 },
  ];

  test("Down and Up walk a column in time order and stop at the ends", () => {
    expect(moveFocus(day, "a", "ArrowDown")).toBe("b");
    expect(moveFocus(day, "b", "ArrowUp")).toBe("a");
    expect(moveFocus(day, "d", "ArrowDown")).toBeNull();
    expect(moveFocus(day, "a", "ArrowUp")).toBeNull();
  });

  test("Right and Left pick the session nearest in time, and stop at the last column", () => {
    expect(moveFocus(day, "b", "ArrowRight")).toBe("c");
    expect(moveFocus(day, "a", "ArrowRight")).toBe("c");
    expect(moveFocus(day, "c", "ArrowLeft")).toBe("b");
    expect(moveFocus(day, "d", "ArrowRight")).toBeNull();
    expect(moveFocus(day, "a", "ArrowLeft")).toBeNull();
  });

  test("Home and End go to the ends of the column", () => {
    expect(moveFocus(day, "b", "Home")).toBe("a");
    expect(moveFocus(day, "a", "End")).toBe("b");
    expect(moveFocus(day, "a", "Home")).toBeNull();
  });

  test("Right skips an empty column and Down steps to the next row on Week", () => {
    const week: NavItem[] = [
      { id: "mon", x: 0, y: 0, start: 10 },
      { id: "wed", x: 2, y: 0, start: 10 },
      { id: "mon2", x: 0, y: 1, start: 10 },
      { id: "thu2", x: 3, y: 1, start: 10 },
    ];
    expect(moveFocus(week, "mon", "ArrowRight")).toBe("wed");
    expect(moveFocus(week, "thu2", "ArrowRight")).toBeNull();
    expect(moveFocus(week, "mon", "ArrowDown")).toBe("mon2");
    expect(moveFocus(week, "mon2", "ArrowUp")).toBe("mon");
    expect(moveFocus(week, "mon2", "ArrowRight")).toBe("thu2");
  });

  test("a key with no target in its direction goes to the next or previous block in reading order", () => {
    // One host on Monday, another on Tuesday: no arrow reaches Tuesday by row or column.
    const split: NavItem[] = [
      { id: "mon", x: 0, y: 0, start: 10 },
      { id: "tue", x: 1, y: 1, start: 10 },
    ];
    expect(moveFocus(split, "mon", "ArrowRight")).toBe("tue");
    expect(moveFocus(split, "mon", "ArrowDown")).toBe("tue");
    expect(moveFocus(split, "tue", "ArrowLeft")).toBe("mon");
    expect(moveFocus(split, "tue", "ArrowUp")).toBe("mon");
    // The ends of the reading order stay put, and on Day the last block of a column goes to the next column.
    expect(moveFocus(split, "mon", "ArrowLeft")).toBeNull();
    expect(moveFocus(split, "tue", "ArrowDown")).toBeNull();
    expect(moveFocus(day, "b", "ArrowDown")).toBe("c");
    expect(moveFocus(day, "c", "ArrowUp")).toBe("b");
  });

  test("other keys and unknown ids do nothing", () => {
    expect(moveFocus(day, "a", "Enter")).toBeNull();
    expect(moveFocus(day, "zzz", "ArrowDown")).toBeNull();
  });

  test("the first block is by row, column, then time", () => {
    expect(firstItem(day)).toBe("a");
    expect(firstItem([])).toBeNull();
    expect(firstItem([{ id: "z", x: 1, y: 0, start: 1 }, { id: "y", x: 0, y: 1, start: 1 }])).toBe("z");
  });
});
