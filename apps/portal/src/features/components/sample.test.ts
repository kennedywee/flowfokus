import { describe, expect, test } from "bun:test";
import { SAMPLE_MEMBERS, sortMembers } from "./sample";

describe("sample members", () => {
  test("Member since sorts by date, not by month name", () => {
    const up = sortMembers(SAMPLE_MEMBERS, { column: "since", direction: "asc" }).map((member) => member.since);
    expect(up).toEqual(["Aug 2022", "May 2023", "Jun 2023", "Nov 2024", "Jan 2025", "Feb 2025"]);
    const down = sortMembers(SAMPLE_MEMBERS, { column: "since", direction: "desc" }).map((member) => member.since);
    expect(down).toEqual([...up].reverse());
  });

  test("each date key matches its label", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const member of SAMPLE_MEMBERS) {
      const [month, year] = member.since.split(" ");
      expect(member.sinceKey).toBe(Number(year) * 100 + months.indexOf(month!) + 1);
    }
  });
});
