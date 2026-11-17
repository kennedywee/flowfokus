import { describe, expect, test } from "bun:test";
import { checkNewMember, fieldMessage, pageItems, rangeLabel } from "./list";

describe("rangeLabel", () => {
  test("counts all members when they fit on one page", () => {
    expect(rangeLabel(0, 16, 16)).toBe("16 members");
    expect(rangeLabel(0, 1, 1)).toBe("1 member");
    expect(rangeLabel(0, 0, 0)).toBe("0 members");
  });

  test("shows the range when there are more pages", () => {
    expect(rangeLabel(0, 50, 212)).toBe("1–50 of 212 members");
    expect(rangeLabel(200, 12, 212)).toBe("201–212 of 212 members");
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
