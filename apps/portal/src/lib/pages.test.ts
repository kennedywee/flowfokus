import { describe, expect, test } from "bun:test";
import type { Permission } from "@flowfokus/api";
import { PAGES, readablePages, startPage } from "./pages";

describe("sidebar pages", () => {
  test("are Calendar, Members, Sales, Programs, Products, in that order", () => {
    expect(PAGES.map((page) => page.label)).toEqual(["Calendar", "Members", "Sales", "Programs", "Products"]);
  });

  test("Calendar opens the schedule route until the Calendar issue renames it", () => {
    expect(PAGES[0]).toMatchObject({ label: "Calendar", to: "/$org/schedule", path: "/schedule" });
  });
});

describe("readablePages", () => {
  test("lists every page for a role that can read them all", () => {
    const all: Permission[] = ["programs:read", "members:read", "purchases:read", "products:read"];
    expect(readablePages(all).map((page) => page.label)).toEqual(["Calendar", "Members", "Sales", "Programs", "Products"]);
  });

  test("hides each page whose permission is missing, and keeps the order", () => {
    expect(readablePages(["products:read", "members:read"]).map((page) => page.label)).toEqual(["Members", "Products"]);
    expect(readablePages(["programs:read"]).map((page) => page.label)).toEqual(["Calendar", "Programs"]);
    expect(readablePages(["purchases:read"]).map((page) => page.label)).toEqual(["Sales"]);
  });

  test("ignores permissions that do not read a page", () => {
    expect(readablePages(["members:create", "settings:manage"])).toEqual([]);
  });
});

describe("startPage", () => {
  test("is Calendar when the role can read programs", () => {
    expect(startPage(["programs:read", "members:read"])?.to).toBe("/$org/schedule");
  });

  test("skips Calendar for a custom role without programs:read, and opens Members", () => {
    expect(startPage(["members:read", "purchases:read", "products:read"])?.to).toBe("/$org/members");
  });

  test("follows the sidebar order, not the order of the permissions", () => {
    expect(startPage(["products:read", "purchases:read"])?.to).toBe("/$org/sales");
    expect(startPage(["products:read"])?.to).toBe("/$org/products");
  });

  test("is null when the role can read no page", () => {
    expect(startPage([])).toBeNull();
    expect(startPage(["settings:manage"])).toBeNull();
  });
});
