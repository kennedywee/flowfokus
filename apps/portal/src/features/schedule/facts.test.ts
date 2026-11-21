import { describe, expect, test } from "bun:test";
import { formatMoney, type Schemas } from "@flowfokus/api";
import {
  atLocation,
  bookingGroup,
  cancelNote,
  capacityText,
  clockTime,
  clockRange,
  dayTitle,
  filterPrograms,
  groupByDay,
  holderNote,
  lengthLabel,
  missingSpot,
  programCounts,
  rangeLabel,
  readScheduleSearch,
  resizeSpots,
  rowStatusText,
  saleAttempt,
  sellLabel,
  sessionName,
  sessionState,
  sessionStatusText,
  sessionTitle,
  shortDay,
  spotChoices,
  ticketAttendees,
  ticketPriceText,
} from "./facts";

const TZ = "Asia/Kuala_Lumpur";
const PROGRAM_A = "11111111-1111-4111-8111-111111111111";
const PROGRAM_B = "22222222-2222-4222-8222-222222222222";

function entry(over: Partial<Schemas["ScheduleEntry"]> = {}, program: Partial<Schemas["ProgramSummary"]> = {}): Schemas["ScheduleEntry"] {
  return {
    id: "o1",
    program_id: PROGRAM_A,
    // 07:00 – 08:00 on Thu 5 Nov in Kuala Lumpur.
    starts_at: "2026-11-04T23:00:00Z",
    ends_at: "2026-11-05T00:00:00Z",
    capacity: 12,
    spots_taken: 11,
    spots_left: 1,
    bookable: true,
    cancelled_at: null,
    cancel_reason: null,
    program: { id: PROGRAM_A, name: "Morning strength", kind: "group_class", location_id: "l1", host_name: "Daniel Wong", published: true, ...program },
    ...over,
  };
}

function booking(over: Partial<Schemas["Booking"]> = {}): Schemas["Booking"] {
  return {
    id: "b1",
    status: "confirmed",
    occurrence_id: "o1",
    program: { id: PROGRAM_A, name: "Morning strength", kind: "group_class" },
    starts_at: "2026-11-04T23:00:00Z",
    ends_at: "2026-11-05T00:00:00Z",
    entitlement: { id: "e1", name: "10-class pass" },
    source: "entitlement",
    sale_id: null,
    held_until: null,
    confirmed_at: "2026-11-03T02:00:00Z",
    cancelled_at: null,
    cancel_reason: null,
    attended_at: null,
    use_returned: false,
    attendee_name: "Ben Tan",
    guest_name: null,
    checkout_id: null,
    member: { id: "m1", name: "Ben Tan", email: "ben@example.com" },
    holder: { id: "m1", name: "Ben Tan", email: "ben@example.com" },
    guest_email: null,
    ...over,
  };
}

const before = new Date("2026-11-04T20:00:00Z");
const after = new Date("2026-11-05T01:00:00Z");

describe("clockTime", () => {
  test("uses a 24-hour clock in the organization's time zone", () => {
    expect(clockTime("2026-11-17T23:42:00Z", "Asia/Kuala_Lumpur")).toBe("07:42");
  });
});

describe("schedule URL", () => {
  test("keeps a valid day and known program IDs only", () => {
    expect(readScheduleSearch({ from: "2026-11-05", program: `${PROGRAM_A},nope,${PROGRAM_A}` })).toEqual({
      from: "2026-11-05",
      program: PROGRAM_A,
    });
    expect(readScheduleSearch({ from: "5 Nov", program: 3 })).toEqual({});
  });
});

describe("days and times", () => {
  test("names the range, the day bands, and the session", () => {
    expect(rangeLabel("2026-11-05")).toBe("Thu 5 Nov – Wed 18 Nov");
    expect(dayTitle("2026-11-05", "2026-11-05")).toBe("Today, Thursday 5 November");
    expect(dayTitle("2026-11-06", "2026-11-05")).toBe("Friday 6 November");
    const session = entry();
    expect(clockRange(session.starts_at, session.ends_at, TZ)).toBe("07:00 – 08:00");
    expect(sessionName(session.starts_at, TZ)).toBe("Thu 5 Nov, 07:00");
    expect(sessionTitle(session.starts_at, session.ends_at, TZ)).toBe("Thu 5 Nov, 07:00 – 08:00");
  });

  test("says how long a session lasts", () => {
    expect(lengthLabel("2026-11-05T01:30:00Z", "2026-11-05T02:00:00Z")).toBe("30 min");
    expect(lengthLabel("2026-11-05T01:00:00Z", "2026-11-05T02:00:00Z")).toBe("1 h");
    expect(lengthLabel("2026-11-05T01:00:00Z", "2026-11-05T02:30:00Z")).toBe("1 h 30 min");
  });

  test("short days count from the gym's today", () => {
    const now = new Date("2026-11-05T02:00:00Z");
    expect(shortDay("2026-11-05T01:00:00Z", TZ, now)).toBe("Today");
    expect(shortDay("2026-11-04T01:00:00Z", TZ, now)).toBe("Yesterday");
    expect(shortDay("2026-10-29T01:00:00Z", TZ, now)).toBe("29 Oct");
  });
});

describe("session state", () => {
  test("cancelled wins, then ended, then full", () => {
    expect(sessionState(entry({ cancelled_at: "2026-11-04T22:00:00Z", cancel_reason: "Coach unwell" }), after)).toBe("cancelled");
    expect(sessionState(entry(), after)).toBe("ended");
    expect(sessionState(entry({ spots_left: 0, spots_taken: 12 }), before)).toBe("full");
    expect(sessionState(entry(), before)).toBe("open");
  });

  test("row and property words match Paper", () => {
    expect(rowStatusText(entry(), after)).toBe("Ended · 11 of 12 booked");
    expect(rowStatusText(entry({ cancelled_at: "x", cancel_reason: "Coach unwell" }), before)).toBe("Cancelled · Coach unwell");
    expect(rowStatusText(entry({ spots_left: 0, spots_taken: 12 }), before)).toBe("Full");
    expect(rowStatusText(entry(), before)).toBe("11 of 12 booked");
    expect(sessionStatusText(entry(), after)).toBe("Ended");
    expect(capacityText(entry(), before)).toBe("12 spots");
    expect(capacityText(entry({ spots_left: 0, spots_taken: 12 }), before)).toBe("12 spots · 12 booked");
  });
});

describe("schedule list", () => {
  const list = [
    entry({ id: "a" }),
    entry({ id: "b", program_id: PROGRAM_B, starts_at: "2026-11-05T23:00:00Z" }, { id: PROGRAM_B, name: "HIIT 30", location_id: "l2" }),
    entry({ id: "c", starts_at: "2026-11-05T23:30:00Z" }),
  ];

  test("shows the top bar location only", () => {
    expect(atLocation(list, "l1").map((item) => item.id)).toEqual(["a", "c"]);
    expect(atLocation(list, null)).toHaveLength(3);
  });

  test("counts and filters programs", () => {
    expect(programCounts(list)).toEqual([
      { id: PROGRAM_B, name: "HIIT 30", count: 1 },
      { id: PROGRAM_A, name: "Morning strength", count: 2 },
    ]);
    expect(filterPrograms(list, [PROGRAM_B]).map((item) => item.id)).toEqual(["b"]);
    expect(filterPrograms(list, [])).toHaveLength(3);
  });

  test("groups sessions by the gym's day", () => {
    expect(groupByDay(list, TZ).map(([day, items]) => [day, items.length])).toEqual([
      ["2026-11-05", 1],
      ["2026-11-06", 2],
    ]);
  });
});

describe("bookings", () => {
  test("bands follow the Rails status", () => {
    expect(bookingGroup("confirmed")).toBe("not_marked");
    expect(bookingGroup("held")).toBe("not_marked");
    expect(bookingGroup("attended")).toBe("attended");
    expect(bookingGroup("expired")).toBe("cancelled");
  });

  test("names guests and other holders", () => {
    expect(holderNote(booking())).toBeNull();
    expect(holderNote(booking({ member: null, attendee_name: "Sara Lee" }))).toBe("Guest of Ben Tan");
    expect(holderNote(booking({ member: { id: "m2", name: "Sara Lee", email: "s@example.com" } }))).toBe("Booked by Ben Tan");
  });

  test("says what happened to a cancelled spot", () => {
    expect(cancelNote(booking({ status: "cancelled", cancel_reason: "Asked to move to Friday", use_returned: true }), null)).toBe(
      "Asked to move to Friday · Credit returned",
    );
    expect(cancelNote(booking({ status: "cancelled", cancel_reason: "Coach unwell", source: "ticket" }), "Coach unwell")).toBe(
      "Refund from the sale",
    );
    expect(cancelNote(booking({ status: "expired" }), null)).toBe("Hold expired, payment not received");
    expect(cancelNote(booking(), null)).toBeNull();
  });
});

describe("ticket sale", () => {
  const price = { label: "Drop-in", amount_minor: 3500, currency: "MYR" };

  test("prices and labels several spots", () => {
    const rm = (minor: number) => formatMoney(minor, "MYR");
    expect(ticketPriceText(price, 1)).toBe(rm(3500));
    expect(ticketPriceText(price, 3)).toBe(`3 × ${rm(3500)} = ${rm(10500)}`);
    expect(sellLabel(price, 1)).toBe(`Sell Drop-in · ${rm(3500)}`);
    expect(sellLabel(price, 3)).toBe(`Sell 3 × Drop-in · ${rm(10500)}`);
    expect(spotChoices(0)).toBe(1);
    expect(spotChoices(3)).toBe(3);
    expect(spotChoices(40)).toBe(10);
  });

  test("the buyer takes the first spot and each other spot needs a name", () => {
    const spots = resizeSpots([], 3, "m1");
    expect(spots.map((spot) => spot.kind)).toEqual(["member", "guest", "guest"]);
    expect(missingSpot(spots)).toBe(1);
    const named = spots.map((spot, index) => (index ? { ...spot, name: `Guest ${index}` } : spot));
    expect(missingSpot(named)).toBe(-1);
    expect(ticketAttendees(named)).toEqual([
      { member_id: "m1" },
      { guest_name: "Guest 1", guest_email: null },
      { guest_name: "Guest 2", guest_email: null },
    ]);
    expect(ticketAttendees(resizeSpots(named, 1, "m1"))).toBeUndefined();
    expect(missingSpot(resizeSpots([], 1, "m1"))).toBe(-1);
  });

  test("a retry keeps its key; a changed sale gets a new one", () => {
    let next = 0;
    const newKey = () => `key-${++next}`;
    const first = saleAttempt({ price: "p1", quantity: 2 }, null, newKey);
    expect(saleAttempt({ price: "p1", quantity: 2 }, first, newKey)).toBe(first);
    expect(saleAttempt({ price: "p1", quantity: 3 }, first, newKey).key).toBe("key-2");
  });
});
