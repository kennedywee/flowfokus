import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { arrivalCounts, arrivals, axisFor, axisPosition, clockStat, placeAvatars, ribbonText, spanText } from "./arrival";

const TZ = "Asia/Kuala_Lumpur";
const at = (clock: string) => new Date(`2026-11-05T${clock}:00+08:00`).getTime();
const roster = { starts_at: new Date(at("07:00")).toISOString(), ends_at: new Date(at("08:00")).toISOString(), cancelled_at: null };

function booking(id: string, status: Schemas["BookingStatus"], attendedAt: string | null = null): Schemas["Booking"] {
  return { id, status, attendee_name: `Member ${id}`, attended_at: attendedAt ? new Date(at(attendedAt)).toISOString() : null } as Schemas["Booking"];
}

describe("the clock stat", () => {
  test("writes spans in minutes, hours, and days", () => {
    expect(spanText(20 * 60_000)).toBe("20 min");
    expect(spanText(1_000)).toBe("1 min");
    expect(spanText(61 * 60_000)).toBe("1 h 1 min");
    expect(spanText(2 * 3_600_000)).toBe("2 h");
    expect(spanText(26 * 3_600_000)).toBe("1 d 2 h");
    expect(spanText(72 * 3_600_000)).toBe("3 d");
  });

  test("counts to the start, then to the end, then back from it", () => {
    expect(clockStat(roster, at("06:40"))).toEqual({ label: "Starts in", value: "20 min" });
    expect(clockStat(roster, at("07:25"))).toEqual({ label: "Ends in", value: "35 min" });
    expect(clockStat(roster, at("10:00"))).toEqual({ label: "Ended", value: "2 h ago" });
    expect(clockStat({ ...roster, cancelled_at: "2026-11-01T00:00:00Z" }, at("06:40"))).toBeNull();
  });
});

describe("who is here", () => {
  const bookings = [
    booking("late", "attended", "06:50"),
    booking("a", "confirmed"),
    booking("early", "attended", "06:31"),
    booking("h", "held"),
    booking("x", "cancelled"),
    booking("e", "expired"),
  ];

  test("lists arrivals in order and counts the rest", () => {
    expect(arrivals(bookings).map((item) => item.id)).toEqual(["early", "late"]);
    expect(arrivalCounts({ bookings, spots_left: 7 })).toEqual({ here: 2, waiting: 2, open: 7 });
  });

  test("writes the counts before and after the session", () => {
    expect(ribbonText({ here: 2, waiting: 9, open: 1 }, false)).toEqual({ waiting: "9", rest: " to arrive, 1 spot open" });
    expect(ribbonText({ here: 2, waiting: 9, open: 3 }, true)).toEqual({ waiting: "9", rest: " not checked in, 3 spots open" });
  });
});

describe("the axis", () => {
  test("starts 30 minutes early, ends with the session, and ticks on the half hour", () => {
    const axis = axisFor(roster, [], TZ);
    expect(axis.start).toBe(at("06:30"));
    expect(axis.end).toBe(at("08:00"));
    expect(axis.ticks.map((tick) => tick.label)).toEqual(["06:30", "07:00", "07:30", "08:00"]);
    expect(axisPosition(at("07:00"), axis)).toBeCloseTo(1 / 3);
    expect(axisPosition(at("05:00"), axis)).toBe(0);
  });

  test("reaches back to an early arrival and forward to a late one", () => {
    const early = axisFor(roster, [{ id: "a", name: "A", at: at("06:10") }], TZ);
    expect(early.start).toBe(at("06:05"));
    const late = axisFor(roster, [{ id: "a", name: "A", at: at("08:20") }], TZ);
    expect(late.end).toBe(at("08:25"));
  });

  test("ticks every hour on a long session", () => {
    const axis = axisFor({ starts_at: new Date(at("09:00")).toISOString(), ends_at: new Date(at("13:00")).toISOString() }, [], TZ);
    expect(axis.ticks.map((tick) => tick.label)).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00"]);
  });
});

describe("avatars", () => {
  test("stack in the lowest lane that is clear and drop what does not fit", () => {
    const placed = placeAvatars(
      [
        { id: "a", x: 100 },
        { id: "b", x: 110 },
        { id: "c", x: 120 },
        { id: "d", x: 125 },
        { id: "e", x: 400 },
      ],
      26,
      3,
    );
    expect(placed.map((item) => [item.id, item.lane])).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
      ["e", 0],
    ]);
  });
});
