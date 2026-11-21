import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { horizonFor, placeLabels, position } from "./timeline";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-17T08:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const name = () => "Monthly unlimited";

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
    const horizon = horizonFor(member({}), name, NOW);
    expect(horizon.events.map((event) => event.kind)).toEqual(["today"]);
    expect(horizon.start).toBe(NOW - 7 * DAY);
    expect(horizon.end).toBe(NOW + 30 * DAY);
  });

  test("keeps bookings inside the window, in time order, and drops cancelled ones", () => {
    const horizon = horizonFor(
      member({
        bookings: [
          booking("later", NOW + 4 * DAY),
          booking("old", NOW - 20 * DAY),
          booking("gone", NOW + DAY, "cancelled"),
          booking("seen", NOW - 2 * DAY, "attended"),
          booking("far", NOW + 40 * DAY),
        ],
      }),
      name,
      NOW,
    );
    expect(horizon.events.map((event) => event.title)).toEqual(["Class seen", "Today", "Class later"]);
    expect(horizon.events[0]).toMatchObject({ past: true });
    expect(horizon.events[2]).toMatchObject({ past: false });
  });

  test("a period end is a mark, unless another period follows it", () => {
    const alone = horizonFor(member({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY)] }), name, NOW);
    expect(alone.events.map((event) => event.title)).toEqual(["Today", "Monthly unlimited ends"]);
    expect(alone.events[1]).toMatchObject({ tone: "warning", past: false });

    const renewed = horizonFor(
      member({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY), period("b", NOW + 20 * DAY, NOW + 50 * DAY)] }),
      name,
      NOW,
    );
    expect(renewed.events.map((event) => event.kind)).toEqual(["today"]);
  });

  test("a revoked period shows a critical mark when it was revoked in the window", () => {
    const horizon = horizonFor(member({ periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY, true)] }), name, NOW);
    expect(horizon.events[0]).toMatchObject({ title: "Monthly unlimited revoked", tone: "critical" });
  });

  test("a right that ends with its period adds no second mark; a pass end does", () => {
    const horizon = horizonFor(
      member({
        periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY)],
        entitlements: [
          { id: "gym", name: "Gym access", ends_at: iso(NOW + 20 * DAY) },
          { id: "pass", name: "10 group classes", ends_at: iso(NOW + 12 * DAY) },
          { id: "ticket", name: "Ticket", ends_at: iso(NOW + 3 * DAY), occurrence_id: "o" },
        ],
      }),
      name,
      NOW,
    );
    expect(horizon.events.map((event) => event.title)).toEqual(["Today", "10 group classes ends", "Monthly unlimited ends"]);
  });

  test("rights that end where a followed period ends add no mark either", () => {
    const horizon = horizonFor(
      member({
        periods: [period("a", NOW - 10 * DAY, NOW + 20 * DAY), period("b", NOW + 20 * DAY, NOW + 50 * DAY)],
        entitlements: [{ id: "gym", name: "Gym access", ends_at: iso(NOW + 20 * DAY) }],
      }),
      name,
      NOW,
    );
    expect(horizon.events.map((event) => event.kind)).toEqual(["today"]);
  });

  test("ten earlier bookings inside the week mean older ones may be missing, so the window starts later", () => {
    const earlier = Array.from({ length: 10 }, (_, index) => booking(`e${index}`, NOW - (index + 1) * 6 * HOUR));
    const horizon = horizonFor(member({ bookings: earlier }), name, NOW);
    expect(horizon.shortened).toBe(true);
    expect(horizon.start).toBe(NOW - 10 * 6 * HOUR);
    expect(horizonFor(member({ bookings: earlier.slice(0, 9) }), name, NOW).shortened).toBe(false);
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
