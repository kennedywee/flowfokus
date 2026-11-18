import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import {
  checkDraft,
  checkPlan,
  checkTicket,
  dayLabel,
  draftChanged,
  draftFields,
  endClock,
  filterFromSearch,
  filterPrograms,
  lastDate,
  lengthChoices,
  lengthText,
  planSummary,
  priceState,
  pricesOnSale,
  programCounts,
  programsRange,
  readProgramsSearch,
  sessionsAdded,
  siteScheduleUrl,
  ticketPrices,
  todayIn,
  upcomingText,
  type ProgramDraft,
} from "./facts";

function program(overrides: Partial<Schemas["ProgramListItem"]> = {}): Schemas["ProgramListItem"] {
  return {
    id: "p1",
    name: "Yoga Flow",
    description: null,
    kind: "group_class",
    location_id: "l1",
    capacity: 12,
    duration_minutes: 60,
    host_name: "Aina Rahim",
    published: true,
    created_at: "2026-11-01T00:00:00Z",
    upcoming_count: 4,
    ...overrides,
  };
}

const draft: ProgramDraft = {
  name: "Kettlebell basics",
  kind: "group_class",
  locationId: "l1",
  host: "",
  duration: "60",
  capacity: "12",
  description: "",
  published: false,
};

describe("programs list", () => {
  const list = [
    program({ id: "a", name: "spin Express", host_name: "Marcus Lee" }),
    program({ id: "b", name: "HIIT 30", kind: "event", published: false }),
    program({ id: "c", name: "Sauna session", kind: "appointment", host_name: null }),
  ];

  test("sorts by name and matches the name or the host", () => {
    const none = { kind: [], visibility: [] };
    expect(filterPrograms(list, none, "").map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(filterPrograms(list, none, "marcus").map((item) => item.id)).toEqual(["a"]);
    expect(filterPrograms(list, none, "SAUNA").map((item) => item.id)).toEqual(["c"]);
  });

  test("filters by kind and visibility from the URL", () => {
    const filter = filterFromSearch(readProgramsSearch({ kind: "event,bogus", visibility: "staff_only" }));
    expect(filter).toEqual({ kind: ["event"], visibility: ["staff_only"] });
    expect(filterPrograms(list, filter, "").map((item) => item.id)).toEqual(["b"]);
    expect(readProgramsSearch({ q: "  ", kind: 3 })).toEqual({});
  });

  test("counts each kind and visibility", () => {
    expect(programCounts(list)).toEqual({ group_class: 1, event: 1, appointment: 1, published: 2, staff_only: 1 });
  });

  test("writes lengths, counts, and the range", () => {
    expect(lengthText(30)).toBe("30 min");
    expect(lengthText(120)).toBe("2 h");
    expect(lengthText(90)).toBe("1 h 30 min");
    expect(upcomingText(0)).toBe("None");
    expect(upcomingText(1)).toBe("1 session");
    expect(upcomingText(16)).toBe("16 sessions");
    expect(programsRange(0, 7, 7)).toBe("1–7 of 7 programs");
    expect(programsRange(50, 1, 51)).toBe("51–51 of 51 programs");
  });
});

describe("program page", () => {
  test("a price is on sale, off sale, or archived", () => {
    expect(priceState({ available: true, archived_at: null })).toBe("on_sale");
    expect(priceState({ available: false, archived_at: null })).toBe("off_sale");
    expect(priceState({ available: false, archived_at: "2026-11-01T00:00:00Z" })).toBe("archived");
  });

  test("lists ticket prices by name and sells only those on sale", () => {
    const price = (label: string, available: boolean, archived_at: string | null = null) => ({
      id: label,
      label,
      amount_minor: 2500,
      currency: "MYR",
      duration_days: null,
      available,
      archived_at,
    });
    const program = { ticket: { product_id: "t", prices: [price("Member guest", false), price("drop-in", true), price("Early bird", false, "2026-11-01T00:00:00Z")] } };
    expect(ticketPrices(program).map((item) => item.label)).toEqual(["drop-in", "Early bird", "Member guest"]);
    expect(pricesOnSale(program).map((item) => item.label)).toEqual(["drop-in"]);
    expect(pricesOnSale({ ticket: null })).toEqual([]);
  });

  test("links to the gym site schedule", () => {
    expect(siteScheduleUrl("chainsaw", "localhost")).toBe("http://chainsaw.localhost:4002/schedule");
    expect(siteScheduleUrl("chainsaw", "portal.flowfokus.com")).toBe("https://chainsaw.flowfokus.com/schedule");
  });
});

describe("adding sessions", () => {
  test("reads the plan Rails accepts", () => {
    expect(checkPlan({ date: "2026-11-17", time: "07:00", weeks: "4" })).toEqual({});
    expect(checkPlan({ date: "", time: "7am", weeks: "27" })).toEqual({
      date: "Choose the first date.",
      time: "Choose a start time.",
      weeks: "Repeat for 1 to 26 weeks.",
    });
  });

  test("says when the sessions run", () => {
    expect(endClock("07:00", 60)).toBe("08:00");
    expect(endClock("23:30", 45)).toBe("00:15");
    expect(lastDate("2026-11-17", 4)).toBe("2026-12-08");
    expect(dayLabel("2026-11-17")).toBe("Tue 17 Nov");
    expect(planSummary({ date: "2026-11-17", time: "07:00", weeks: 4 })).toEqual({
      count: "4 sessions",
      detail: "Tuesdays, 07:00 · 17 Nov to 8 Dec",
    });
    expect(planSummary({ date: "2026-11-17", time: "07:00", weeks: 1 })).toEqual({ count: "1 session", detail: "Tue 17 Nov, 07:00" });
  });

  test("today is the gym's day", () => {
    expect(todayIn("Asia/Kuala_Lumpur", new Date("2026-11-17T20:00:00Z"))).toBe("2026-11-18");
  });

  test("the toast counts what Rails added", () => {
    expect(sessionsAdded(4, 4, 12)).toEqual({ title: "4 sessions added", body: "Each session has 12 spots." });
    expect(sessionsAdded(1, 1, 1)).toEqual({ title: "1 session added", body: "Each session has 1 spot." });
    expect(sessionsAdded(2, 4, 12).body).toBe("Sessions that already existed were skipped.");
  });
});

describe("program form", () => {
  test("checks what Rails checks, in staff words", () => {
    expect(checkDraft(draft)).toEqual({});
    expect(checkDraft({ ...draft, name: " ", capacity: "0", duration: "", locationId: "" })).toEqual({
      name: "Enter a name.",
      capacity: "Enter 1 to 10,000.",
      duration: "Choose a length.",
      location: "Choose where it happens.",
    });
    expect(checkDraft({ ...draft, capacity: "10001" }).capacity).toBe("Enter 1 to 10,000.");
  });

  test("sends Note as the description", () => {
    expect(draftFields({ ...draft, description: "  Bring a mat. ", host: " Aina " })).toMatchObject({
      description: "Bring a mat.",
      host_name: "Aina",
      capacity: 12,
      duration_minutes: 60,
    });
    expect(draftFields(draft)).toMatchObject({ description: null, host_name: null });
  });

  test("knows when the form changed", () => {
    expect(draftChanged(draft, draft)).toBe(false);
    expect(draftChanged({ ...draft, name: "Other" }, draft)).toBe(true);
    expect(draftChanged(draft, draft, true)).toBe(true);
  });

  test("keeps a saved length in the menu", () => {
    expect(lengthChoices(60)).not.toContain(50);
    expect(lengthChoices(50)).toContain(50);
  });

  test("ticket errors are one line each", () => {
    expect(checkTicket("", null, "MYR")).toEqual({ label: "Enter a name, for example Drop-in.", amount: "Enter a price, like 25.50." });
    expect(checkTicket("Drop-in", 3500, "MYR")).toEqual({});
    expect(checkTicket("Drop-in", null, "JPY").amount).toBe("Enter a price, like 25.");
  });
});
