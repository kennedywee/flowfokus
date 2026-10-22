import { describe, expect, test } from "bun:test";
import type { Schemas } from "@flowfokus/api";
import { startOrganization, toOrganizationChoices } from "./start";

const memberships: Schemas["StaffMembership"][] = [
  { slug: "chainsaw", name: "Chainsaw Gym", workos_organization_id: "org_chainsaw", role: "owner" },
  { slug: "ironworks", name: "Ironworks", workos_organization_id: "org_ironworks", role: "manager" },
  { slug: "harbor", name: "Harbor Climbing", workos_organization_id: "org_harbor", role: "staff" },
];

describe("toOrganizationChoices", () => {
  test("marks only the organization the session holds", () => {
    const choices = toOrganizationChoices(memberships, "org_ironworks");
    expect(choices.filter((choice) => choice.active).map((choice) => choice.slug)).toEqual(["ironworks"]);
  });

  test("never sends the WorkOS organization ID to the browser", () => {
    const choices = toOrganizationChoices(memberships, "org_ironworks");
    expect(JSON.stringify(choices)).not.toContain("org_");
    expect(choices[0]).toEqual({ slug: "chainsaw", name: "Chainsaw Gym", role: "owner", active: false });
  });

  test("marks nothing when the session holds no organization, or one the user cannot open", () => {
    for (const sessionOrganizationId of [null, "org_elsewhere"]) {
      expect(toOrganizationChoices(memberships, sessionOrganizationId).some((choice) => choice.active)).toBe(false);
    }
  });
});

describe("startOrganization", () => {
  test("opens the organization picked at sign-in, even when it is not first", () => {
    expect(startOrganization(toOrganizationChoices(memberships, "org_harbor"))).toBe("harbor");
  });

  test("asks the user to choose when the session holds none of several organizations", () => {
    expect(startOrganization(toOrganizationChoices(memberships, null))).toBeNull();
    expect(startOrganization(toOrganizationChoices(memberships, "org_elsewhere"))).toBeNull();
  });

  test("opens the only organization, with or without a session organization", () => {
    const one = memberships.slice(0, 1);
    expect(startOrganization(toOrganizationChoices(one, null))).toBe("chainsaw");
    expect(startOrganization(toOrganizationChoices(one, "org_elsewhere"))).toBe("chainsaw");
  });

  test("opens nothing without organizations", () => {
    expect(startOrganization(toOrganizationChoices([], "org_chainsaw"))).toBeNull();
  });
});
