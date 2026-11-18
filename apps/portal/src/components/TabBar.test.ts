import { describe, expect, test } from "bun:test";
import { hidesTabBar, ownerTab } from "./TabBar";

describe("phone tab bar", () => {
  test("selects the tab that owns the page", () => {
    expect(ownerTab("/chainsaw", "chainsaw")).toBe("Home");
    expect(ownerTab("/chainsaw/", "chainsaw")).toBe("Home");
    expect(ownerTab("/chainsaw/members/abc", "chainsaw")).toBe("Members");
    expect(ownerTab("/chainsaw/check-in", "chainsaw")).toBe("Check in");
    expect(ownerTab("/chainsaw/sales/new", "chainsaw")).toBe("Sales");
  });

  test("gives every other page to More", () => {
    expect(ownerTab("/chainsaw/schedule", "chainsaw")).toBe("More");
    expect(ownerTab("/chainsaw/salesy", "chainsaw")).toBe("More");
  });

  test("hides on full-page create forms", () => {
    expect(hidesTabBar("/chainsaw/sales/new", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/members/new/", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/programs/new", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/programs/0b0c/edit", "chainsaw")).toBe(true);
    expect(hidesTabBar("/chainsaw/sales", "chainsaw")).toBe(false);
    expect(hidesTabBar("/chainsaw/programs/0b0c", "chainsaw")).toBe(false);
  });
});
