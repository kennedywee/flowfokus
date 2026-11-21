import { describe, expect, test } from "bun:test";
import { isRemovedPage } from "./removed-pages";

describe("removed pages", () => {
  test("old URLs of removed pages are found", () => {
    for (const page of ["inbox", "agents", "check-in", "reports", "changelog", "soon", "settings/integrations"]) {
      expect(isRemovedPage(`/chainsaw/${page}`, "chainsaw")).toBe(true);
    }
    expect(isRemovedPage("/chainsaw/reports/", "chainsaw")).toBe(true);
  });

  test("pages that stay are left alone", () => {
    expect(isRemovedPage("/chainsaw", "chainsaw")).toBe(false);
    expect(isRemovedPage("/chainsaw/schedule", "chainsaw")).toBe(false);
    expect(isRemovedPage("/chainsaw/settings/staff", "chainsaw")).toBe(false);
    expect(isRemovedPage("/chainsaw/members/inbox", "chainsaw")).toBe(false);
  });
});
