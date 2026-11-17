import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { clockTime, filterCheckIns, noMatchText, readCheckInsSearch, resultText, todayCountText, todayOnly } from "./facts";

function checkIn(over: Partial<Schemas["CheckIn"]>): Schemas["CheckIn"] {
  return {
    id: "c1",
    member: { id: "m1", name: "Farah Aziz", email: "farah@example.com" },
    location_id: "l1",
    result: "granted",
    denial_reason: null,
    entitlement_id: null,
    override_reason: null,
    checked_in_at: "2026-11-18T00:42:00Z",
    ...over,
  };
}

describe("check-in facts", () => {
  test("result words follow the Rails result and reason", () => {
    expect(resultText(checkIn({}))).toBe("Checked in");
    expect(resultText(checkIn({ override_reason: "Paying today" }))).toBe("Checked in · Let in by staff");
    expect(resultText(checkIn({ result: "denied", denial_reason: "usage_limit_reached" }))).toBe("Denied · No visits left");
  });

  test("today is the organization's day, and times use a 24-hour clock", () => {
    const now = new Date("2026-11-18T04:00:00Z");
    const rows = [checkIn({ id: "a" }), checkIn({ id: "b", checked_in_at: "2026-11-17T16:30:00Z" })];
    // 17 Nov 16:30 UTC is 18 Nov 00:30 in Kuala Lumpur.
    expect(todayOnly(rows, "Asia/Kuala_Lumpur", now).map((row) => row.id)).toEqual(["a", "b"]);
    expect(todayOnly(rows, "UTC", now).map((row) => row.id)).toEqual(["a"]);
    expect(clockTime("2026-11-17T23:42:00Z", "Asia/Kuala_Lumpur")).toBe("07:42");
  });

  test("filters by result and member search", () => {
    const rows = [checkIn({ id: "a" }), checkIn({ id: "b", result: "denied", member: { id: "m2", name: "Kenji Sato", email: "k@example.com" } })];
    expect(filterCheckIns(rows, ["denied"], "").map((row) => row.id)).toEqual(["b"]);
    expect(filterCheckIns(rows, [], "farah").map((row) => row.id)).toEqual(["a"]);
    expect(noMatchText(["denied"], "kenji")).toBe("No denied check-ins match “kenji”");
  });

  test("reads the URL and the day count", () => {
    expect(readCheckInsSearch({ result: "denied,bogus", q: " kenji " })).toEqual({ result: "denied", q: "kenji" });
    expect(todayCountText({ granted: 83, denied: 3 })).toBe("86 check-ins today · 3 denied");
    expect(todayCountText({ granted: 1, denied: 0 })).toBe("1 check-in today");
  });
});
