import { describe, expect, test } from "bun:test";
import type { Permission } from "@flowfokus/api";
import { shortcutGroups } from "./KeyboardShortcuts";

const role = (...permissions: Permission[]) => (permission: Permission) => permissions.includes(permission);
const keys = (groups: ReturnType<typeof shortcutGroups>) => groups.flatMap((group) => group.items.flatMap((item) => item.keys));

describe("keyboard shortcuts sheet", () => {
  test("lists every key for a role that can use them all", () => {
    const groups = shortcutGroups("⌘", role(
      "members:read", "purchases:read", "check_ins:read", "check_ins:create", "purchases:create",
      "payments:create", "purchases:fulfill", "programs:read", "bookings:manage",
    ));
    expect(keys(groups)).toEqual(["⌘K", "⌘,", "⌘B", "?", "C", "S", "/", "P", "F", "B", "A", "⌘↵"]);
    expect(groups.map((group) => group.title)).toContain("Members, Sales and Check-ins");
  });

  test("leaves out keys the role cannot use, and empty groups", () => {
    const groups = shortcutGroups("Ctrl ", role("members:read", "check_ins:read", "check_ins:create"));
    expect(keys(groups)).toEqual(["Ctrl K", "Ctrl ,", "Ctrl B", "?", "C", "/", "Ctrl ↵"]);
    expect(groups.map((group) => group.title)).toEqual(["Anywhere", "Home and member page", "Members and Check-ins", "Forms and dialogs"]);
  });

  test("shows no list search without a list to read", () => {
    expect(keys(shortcutGroups("⌘", role()))).not.toContain("/");
  });
});
