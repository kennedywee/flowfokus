import { describe, expect, test } from "bun:test";
import { clockTime, denialAccess, firstName } from "./facts";

describe("check-in facts", () => {
  test("times use a 24-hour clock in the organization's time zone", () => {
    expect(clockTime("2026-11-17T23:42:00Z", "Asia/Kuala_Lumpur")).toBe("07:42");
  });

  test("the denial dialog names the rule Rails reported", () => {
    expect(denialAccess("no_entitlement", "Bangsar")).toBe("No active access");
    expect(denialAccess("location_not_allowed", "Bangsar")).toBe("Not valid at Bangsar");
    expect(denialAccess("usage_limit_reached", "Bangsar")).toBe("No visits left this period");
    expect(denialAccess(null, "Bangsar")).toBe("No reason given");
  });

  test("the first name is the first word", () => {
    expect(firstName("Farah Aziz")).toBe("Farah");
  });
});
