import { describe, expect, test } from "bun:test";
import { pageItems } from "../../lib/paging";
import { DEFAULT_MEMBER_COLUMNS, DEFAULT_MEMBER_SORT, checkNewMember, fieldMessage, isDefaultDisplay, sortMembers } from "./list";

describe("sortMembers", () => {
  const members = [
    { name: "ben tan", created_at: "2026-11-20T10:00:00Z" },
    { name: "Ánh Nguyen", created_at: "2026-11-21T10:00:00Z" },
    { name: "Chloe Lim", created_at: "2026-11-19T10:00:00Z" },
  ];

  test("sorts by name without regard to case, both ways", () => {
    expect(sortMembers(members, { column: "name", direction: "asc" }).map((m) => m.name)).toEqual(["Ánh Nguyen", "ben tan", "Chloe Lim"]);
    expect(sortMembers(members, { column: "name", direction: "desc" }).map((m) => m.name)).toEqual(["Chloe Lim", "ben tan", "Ánh Nguyen"]);
  });

  test("sorts by the moment the member joined", () => {
    expect(sortMembers(members, { column: "since", direction: "desc" }).map((m) => m.name)).toEqual(["Ánh Nguyen", "ben tan", "Chloe Lim"]);
    expect(sortMembers(members, { column: "since", direction: "asc" }).map((m) => m.name)).toEqual(["Chloe Lim", "ben tan", "Ánh Nguyen"]);
  });

  test("keeps the order Rails sent for equal values and leaves the input alone", () => {
    const same = [
      { name: "A", created_at: "2026-11-20T10:00:00Z" },
      { name: "B", created_at: "2026-11-20T10:00:00Z" },
    ];
    expect(sortMembers(same, DEFAULT_MEMBER_SORT).map((m) => m.name)).toEqual(["A", "B"]);
    expect(sortMembers(same, { column: "since", direction: "asc" }).map((m) => m.name)).toEqual(["A", "B"]);
    expect(members[0]!.name).toBe("ben tan");
  });
});

describe("isDefaultDisplay", () => {
  test("is true only for the starting sort and columns", () => {
    expect(isDefaultDisplay(DEFAULT_MEMBER_SORT, DEFAULT_MEMBER_COLUMNS)).toBe(true);
    expect(isDefaultDisplay({ column: "name", direction: "asc" }, DEFAULT_MEMBER_COLUMNS)).toBe(false);
    expect(isDefaultDisplay(DEFAULT_MEMBER_SORT, { email: false, since: true })).toBe(false);
  });
});

describe("pageItems", () => {
  test("lists every page when there are few", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
  });

  test("keeps the ends and the neighbours, with gaps between", () => {
    expect(pageItems(5, 9)).toEqual([1, "gap", 4, 5, 6, "gap", 9]);
    expect(pageItems(1, 9)).toEqual([1, 2, "gap", 9]);
    expect(pageItems(9, 9)).toEqual([1, "gap", 8, 9]);
  });
});

describe("checkNewMember", () => {
  test("accepts a name and an email address", () => {
    expect(checkNewMember("Aisyah Rahman", " aisyah@example.com ")).toEqual({});
  });

  test("asks for a name and a valid email", () => {
    expect(checkNewMember("  ", "aisyah")).toEqual({
      name: "Enter the member's full name.",
      email: "Enter an email address, for example name@example.com.",
    });
    expect(checkNewMember("Aisyah", "")).toEqual({ email: "Enter an email address, for example name@example.com." });
  });
});

describe("fieldMessage", () => {
  test("turns Rails attribute errors into sentences", () => {
    expect(fieldMessage("Email", ["is already used by another member"])).toBe("Email is already used by another member.");
    expect(fieldMessage("Name", ["can't be blank", "is too long"])).toBe("Name can't be blank. Name is too long.");
    expect(fieldMessage("Email", ["Use a work address."])).toBe("Use a work address.");
  });

  test("returns nothing without messages", () => {
    expect(fieldMessage("Email", undefined)).toBeUndefined();
    expect(fieldMessage("Email", [])).toBeUndefined();
  });
});
