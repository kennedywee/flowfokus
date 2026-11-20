import { describe, expect, test } from "bun:test";
import { pageItems } from "../../lib/paging";
import { checkMember, checkNewMember, emergencyContact, fieldMessage, formatBirthDate, memberChanges, memberFields, rangeLabel, todayIn } from "./list";

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

describe("checkMember", () => {
  const valid = { name: "Aisyah Rahman", email: "aisyah@example.com" };

  test("accepts empty optional details", () => {
    expect(checkMember({ ...valid, phone: " ", date_of_birth: "", emergency_contact_phone: "" }, "2026-11-20")).toEqual({});
  });

  test("accepts phone numbers Rails accepts", () => {
    expect(checkMember({ ...valid, phone: "+60 12-345 6789", emergency_contact_phone: "(03) 5555.0101" })).toEqual({});
  });

  test("asks for digits in a phone number", () => {
    const phone = "Enter a phone number with digits only, for example +60 12 345 6789.";
    expect(checkMember({ ...valid, phone: "call me", emergency_contact_phone: "123" })).toEqual({ phone, emergency_contact_phone: phone });
    expect(checkNewMember("Aisyah", "aisyah@example.com", "abc")).toEqual({ phone });
  });

  test("refuses a date of birth after today", () => {
    expect(checkMember({ ...valid, date_of_birth: "2026-11-20" }, "2026-11-20")).toEqual({});
    expect(checkMember({ ...valid, date_of_birth: "2026-11-21" }, "2026-11-20")).toEqual({
      date_of_birth: "Enter a date that is not in the future.",
    });
  });
});

describe("member details", () => {
  const empty = { name: "Aisyah", email: "a@example.com", phone: null, date_of_birth: null, emergency_contact_name: null, emergency_contact_phone: null, note: null };

  test("turns missing values into empty form text", () => {
    expect(memberFields(empty)).toEqual({ name: "Aisyah", email: "a@example.com", phone: "", date_of_birth: "", emergency_contact_name: "", emergency_contact_phone: "", note: "" });
  });

  test("sends only the fields staff changed", () => {
    const start = memberFields({ ...empty, phone: "012 555 0101", note: "Knee injury" });
    expect(memberChanges(start, start)).toEqual({});
    expect(memberChanges(start, { ...start, name: " Aisyah " })).toEqual({});
    expect(memberChanges(start, { ...start, phone: " 012 555 0202 " })).toEqual({ phone: "012 555 0202" });
    expect(memberChanges(start, { ...start, name: "Aisyah Rahman", note: " " })).toEqual({ name: "Aisyah Rahman", note: null });
  });

  test("joins the emergency contact's name and phone", () => {
    expect(emergencyContact(empty)).toBeNull();
    expect(emergencyContact({ emergency_contact_name: "Rahman Ali", emergency_contact_phone: null })).toBe("Rahman Ali");
    expect(emergencyContact({ emergency_contact_name: "Rahman Ali", emergency_contact_phone: "012 555 0101" })).toBe("Rahman Ali · 012 555 0101");
  });

  test("shows a date of birth without shifting the day", () => {
    expect(formatBirthDate("1994-03-09")).toBe("9 Mar 1994");
  });

  test("finds today in the organization's time zone", () => {
    expect(todayIn("Asia/Kuala_Lumpur", new Date("2026-11-20T17:30:00Z"))).toBe("2026-11-21");
    expect(todayIn("UTC", new Date("2026-11-20T17:30:00Z"))).toBe("2026-11-20");
  });
});
