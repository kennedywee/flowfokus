import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { horizonFor, placeLabels, position, shiftDays } from "./timeline";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-17T08:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const name = () => "Monthly unlimited";
const ZONE = "Asia/Kuala_Lumpur";
const horizonOf = (parts: Parameters<typeof member>[0], now = NOW, zone = ZONE) => horizonFor(member(parts), name, now, zone);

function booking(id: string, at: number, status: Schemas["BookingStatus"] = "confirmed"): Schemas["Booking"] {
  return { id, status, starts_at: iso(at), program: { id: "p", name: `Class ${id}`, kind: "group_class" } } as unknown as Schemas["Booking"];
}
function period(id: string, starts: number, ends: number, revoked = false): Schemas["MembershipPeriod"] {
  return { id, membership_id: "m", sale_id: "s", fulfillment_id: "f", starts_at: iso(starts), ends_at: iso(ends), revoked_at: revoked ? iso(NOW - HOUR) : null };
}
function member(parts: { bookings?: Schemas["Booking"][]; periods?: Schemas["MembershipPeriod"][]; entitlements?: Partial<Schemas["Entitlement"]>[] }) {
  return {
    bookings: parts.bookings ?? [],
    membership: parts.periods ? { id: "m", created_at: iso(NOW), periods: parts.periods } : null,
    entitlements: (parts.entitlements ?? []).map((right) => ({ occurrence_id: null, ...right })),
  } as unknown as Schemas["MemberDetail"];
}

describe("horizonFor", () => {
  test("a member with nothing has only the today mark", () => {
    const horizon = horizonOf({});
    expect(horizon.events.map((event) => event.kind)).toEqual(["today"]);
    expect(horizon.start).toBe(NOW - 7 * DAY);
    expect(horizon.end).toBe(NOW + 30 * DAY);
  });

  test("keeps bookings inside the window, in time order, and drops cancelled ones", () => {
    const horizon = horizonOf({
      bookings: [
        booking("later", NOW + 4 * DAY),
        booking("old", NOW - 20 * DAY),
        booking("gone", NOW + DAY, "cancelled"),
        booking("seen", NOW - 2 * DAY, "attended"),
        booking("far", NOW + 40 * DAY),
      ],
    });
    expect(horizon.events.map((event) => event.title)).toEqual(["Class seen", "Today", "Class later"]);
    expect(horizon.events[0]).toMatchObject({ past: true });
    expect(horizon.events[2]).toMatchObject({ past: false });
  });

  test("a period end is a mark, unless another period follows it", () => {
    const alone = horizonOf({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY)] });
    expect(alone.events.map((event) => event.title)).toEqual(["Today", "Monthly unlimited ends"]);
    expect(alone.events[1]).toMatchObject({ tone: "warning", past: false });

    const renewed = horizonOf({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY), period("b", NOW + 20 * DAY, NOW + 50 * DAY)] });
    expect(renewed.events.map((event) => event.kind)).toEqual(["today"]);
  });

  test("a revoked period shows a critical mark when it was revoked in the window", () => {
    const horizon = horizonOf({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY, true)] });
    expect(horizon.events[0]).toMatchObject({ title: "Monthly unlimited revoked", tone: "critical" });
  });

  test("a pass end stays, even when it ends with a period: Rails does not link a right to a period", () => {
    const horizon = horizonOf({
      periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY)],
      entitlements: [
        { id: "gym", name: "Gym access", ends_at: iso(NOW + 20 * DAY) },
        { id: "pass", name: "10 group classes", ends_at: iso(NOW + 20 * DAY + 30_000) },
        { id: "ticket", name: "Ticket", ends_at: iso(NOW + 3 * DAY), occurrence_id: "o" },
      ],
    });
    expect(horizon.events.map((event) => event.title).sort()).toEqual(
      ["10 group classes ends", "Gym access ends", "Monthly unlimited ends", "Today"].sort(),
    );
  });

  test("a right's end stays when another period follows the period", () => {
    const horizon = horizonOf({
      periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY), period("b", NOW + 20 * DAY, NOW + 50 * DAY)],
      entitlements: [{ id: "gym", name: "Gym access", ends_at: iso(NOW + 20 * DAY) }],
    });
    expect(horizon.events.map((event) => event.title)).toEqual(["Today", "Gym access ends"]);
  });

  test("ten recent bookings do not move the start, so last week's revocation still shows", () => {
    const earlier = Array.from({ length: 10 }, (_, index) => booking(`e${index}`, NOW - (index + 1) * 6 * HOUR));
    const horizon = horizonOf({ bookings: earlier, periods: [period("a", NOW - 30 * DAY, NOW + 20 * DAY, true)] });
    expect(horizon.start).toBe(NOW - 7 * DAY);
    expect(horizon.events.map((event) => event.title)).toContain("Monthly unlimited revoked");
  });

  test("the window is calendar days in the organization's time zone, across a clock change", () => {
    // America/New_York: clocks go forward on 8 Mar 2026. 12 Mar 08:00 EDT is 12:00Z.
    const now = Date.parse("2026-03-12T12:00:00Z");
    const horizon = horizonOf({}, now, "America/New_York");
    expect(iso(horizon.start)).toBe("2026-03-05T13:00:00.000Z"); // 08:00 EST, not 07:00
    expect(iso(horizon.end)).toBe("2026-04-11T12:00:00.000Z"); // 08:00 EDT
    expect(horizon.ticks).toHaveLength(38);
    expect(horizon.ticks[7]).toBe(now);
    expect(horizon.ticks.filter((at) => at % HOUR === 0)).toHaveLength(38);
    // The day that holds the change is 23 hours long.
    expect(horizon.ticks[3]! - horizon.ticks[2]!).toBe(23 * HOUR);
  });
});

describe("shiftDays", () => {
  test("keeps the wall-clock time and the milliseconds", () => {
    const at = Date.parse("2026-11-01T05:30:15.250Z"); // 01:30:15 EDT; clocks go back that morning
    expect(iso(shiftDays(at, 1, "America/New_York"))).toBe("2026-11-02T06:30:15.250Z");
    expect(iso(shiftDays(at, -1, "America/New_York"))).toBe("2026-10-31T05:30:15.250Z");
  });

  test("a zone without clock changes shifts by 24 hours", () => {
    expect(shiftDays(NOW, 30, ZONE)).toBe(NOW + 30 * DAY);
  });
});

describe("position", () => {
  test("is the share of the window, clamped", () => {
    expect(position(NOW, NOW - 7 * DAY, NOW + 30 * DAY)).toBeCloseTo(7 / 37);
    expect(position(NOW - 9 * DAY, NOW - 7 * DAY, NOW + 30 * DAY)).toBe(0);
  });
});

describe("placeLabels", () => {
  test("alternates lanes and leaves out a label that fits nowhere", () => {
    const placed = placeLabels(
      [
        { id: "today", x: 150, width: 80 },
        { id: "a", x: 190, width: 100 },
        { id: "b", x: 200, width: 100 },
        { id: "c", x: 210, width: 100 },
      ],
      760,
      "today",
    );
    expect(placed.get("today")).toEqual({ lane: "above", align: "start" });
    expect(placed.get("a")).toEqual({ lane: "below", align: "start" });
    expect(placed.get("b")).toBeNull();
    expect(placed.get("c")).toBeNull();
  });

  test("a label at the right edge ends at its mark", () => {
    const placed = placeLabels([{ id: "end", x: 740, width: 120 }], 760);
    expect(placed.get("end")).toEqual({ lane: "above", align: "end" });
  });
});
