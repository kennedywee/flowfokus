import { describe, expect, test } from "bun:test";
import { hidesTabBar, ownerTab } from "./TabBar";

describe("phone tab bar", () => {
  test("selects the tab that owns the page", () => {
    expect(ownerTab("/chainsaw/calendar", "chainsaw")).toBe("Calendar");
    expect(ownerTab("/chainsaw/members/abc", "chainsaw")).toBe("Members");
    expect(ownerTab("/chainsaw/sales/new", "chainsaw")).toBe("Sales");
  });

  test("gives every other page to More", () => {
    expect(ownerTab("/chainsaw/programs", "chainsaw")).toBe("More");
    expect(ownerTab("/chainsaw/salesy", "chainsaw")).toBe("More");
  });

  test("hides on full-page create forms", () => {
    expect(hidesTabBar("/chainsaw/sales/new", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/members/new/", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/programs/new", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/programs/0b0c/edit", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/products/new", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/products/0b0c/edit", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/sales", "chainsaw")).toBe(false);
    expect(hidesTabBar("/chainsaw/programs/0b0c", "chainsaw")).toBe(false);
  });
});
