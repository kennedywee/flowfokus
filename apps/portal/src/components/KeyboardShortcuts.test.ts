import { describe, expect, test } from "bun:test";
import type { Permission } from "@flowfokus/api";
import { shortcutGroups } from "./KeyboardShortcuts";

const role = (...permissions: Permission[]) => (permission: Permission) => permissions.includes(permission);
const keys = (groups: ReturnType<typeof shortcutGroups>) => groups.flatMap((group) => group.items.flatMap((item) => item.keys));

describe("keyboard shortcuts sheet", () => {
  test("lists every key for a role that can use them all", () => {
    const groups = shortcutGroups("⌘", role(
      "members:read", "purchases:read", "purchases:create",
      "payments:create", "purchases:fulfill", "programs:read", "bookings:manage",
    ));
    expect(keys(groups)).toEqual(["⌘K", "⌘,", "⌘B", "?", "S", "/", "P", "F", "S", "B", "B", "A", "⌘↵"]);
    expect(groups.map((group) => group.title)).toContain("Members, Sales and Programs");
  });

  test("leaves out keys the role cannot use, and empty groups", () => {
    const groups = shortcutGroups("Ctrl ", role("members:read"));
    expect(keys(groups)).toEqual(["Ctrl K", "Ctrl ,", "Ctrl B", "?", "/", "Ctrl ↵"]);
    expect(groups.map((group) => group.title)).toEqual(["Anywhere", "Members", "Forms and dialogs"]);
  });

  test("lists the program page keys for a manager", () => {
    const groups = shortcutGroups("⌘", role("programs:read", "programs:manage"));
    expect(groups.find((group) => group.title === "Program page")?.items.flatMap((item) => item.keys)).toEqual(["T", "⇧P"]);
    expect(groups.map((group) => group.title)).toContain("Programs");
  });

  test("lists the product page keys only for roles that can use them", () => {
    const keysOf = (groups: ReturnType<typeof shortcutGroups>) => groups.find((group) => group.title === "Product page")?.items.flatMap((item) => item.keys);
    expect(keysOf(shortcutGroups("⌘", role("products:read", "products:update", "purchases:create")))).toEqual(["S", "E"]);
    expect(keysOf(shortcutGroups("⌘", role("products:read", "purchases:create")))).toEqual(["S"]);
    expect(keysOf(shortcutGroups("⌘", role("products:read")))).toBeUndefined();
    expect(shortcutGroups("⌘", role("products:read")).map((group) => group.title)).toContain("Products");
  });

  test("lists N on the members list only for a role that can create members", () => {
    const keysOf = (groups: ReturnType<typeof shortcutGroups>) => groups.find((group) => group.title === "Members list")?.items.flatMap((item) => item.keys);
    expect(keysOf(shortcutGroups("⌘", role("members:read", "members:create")))).toEqual(["N"]);
    expect(keysOf(shortcutGroups("⌘", role("members:read")))).toBeUndefined();
  });

  test("lists N on the programs list only for a role that can manage programs", () => {
    const keysOf = (groups: ReturnType<typeof shortcutGroups>) => groups.find((group) => group.title === "Programs list")?.items.flatMap((item) => item.keys);
    expect(keysOf(shortcutGroups("⌘", role("programs:read", "programs:manage")))).toEqual(["N"]);
    expect(keysOf(shortcutGroups("⌘", role("programs:read")))).toBeUndefined();
  });

  test("shows no list search without a list to read", () => {
    expect(keys(shortcutGroups("⌘", role()))).not.toContain("/");
  });
});
