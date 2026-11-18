import { describe, expect, test } from "bun:test";
import { changeSummary, gymSiteAddress, locationCount, locationFieldError, zoneChoices, zoneLabel } from "./facts";
import type { Failure } from "../../lib/result";
import { ABILITIES, reach } from "./abilities";
import { isSettingsPath, sectionFromOldLink, settingsSectionFor } from "./sections";
import { firstName, invitationLine, listedMembers, inviteFailure, memberStatus, roleChoices, roleName, staffChangeFailure, staffCount } from "./team";

const failure = (code: Failure["code"], message = ""): Failure => ({ status: 422, code, message });

describe("settings sections", () => {
  test("old section links open the renamed sections", () => {
    expect(sectionFromOldLink("Organization")).toBe("/$org/settings/general");
    expect(sectionFromOldLink("team")).toBe("/$org/settings/staff");
    expect(sectionFromOldLink("Locations")).toBe("/$org/settings/locations");
    expect(sectionFromOldLink("Notifications")).toBe("/$org/settings/notifications");
    expect(sectionFromOldLink("billing")).toBeUndefined();
    expect(sectionFromOldLink(3)).toBeUndefined();
  });

  test("Roles belongs to Staff, and the index belongs to no section", () => {
    expect(settingsSectionFor("/chainsaw/settings/roles", "chainsaw")?.label).toBe("Staff");
    expect(settingsSectionFor("/chainsaw/settings/locations/", "chainsaw")?.label).toBe("Locations");
    expect(settingsSectionFor("/chainsaw/settings", "chainsaw")).toBeUndefined();
  });

  test("settings pages are told apart from other pages", () => {
    expect(isSettingsPath("/chainsaw/settings", "chainsaw")).toBe(true);
    expect(isSettingsPath("/chainsaw/settings/staff", "chainsaw")).toBe(true);
    expect(isSettingsPath("/chainsaw/settingsx", "chainsaw")).toBe(false);
    expect(isSettingsPath("/chainsaw/members", "chainsaw")).toBe(false);
  });
});

describe("staff facts", () => {
  test("counts invitations as staff, as Paper does", () => {
    const members = [{ status: "active", email: "a@x.test" }, { status: "active", email: "b@x.test" }];
    expect(staffCount({ members, invitations: [{ email: "c@x.test" }] } as never)).toBe("3 staff");
  });

  test("lists an invited person once, as the invitation", () => {
    const team = {
      members: [
        { status: "active", email: "a@x.test" },
        { status: "pending", email: "New@x.test" },
        { status: "pending", email: "other@x.test" },
      ],
      invitations: [{ email: "new@x.test" }],
    } as never;
    expect(listedMembers(team).map((member: { email: string }) => member.email)).toEqual(["a@x.test", "other@x.test"]);
    expect(staffCount(team)).toBe("3 staff");
  });

  test("marks only members who are not active", () => {
    expect(memberStatus("active")).toBeNull();
    expect(memberStatus("pending")).toEqual({ label: "Not synced yet", tone: "warning" });
    expect(memberStatus("inactive")).toEqual({ label: "Inactive", tone: "muted" });
  });

  test("says when an invitation expires", () => {
    const now = new Date("2026-11-18T04:00:00Z");
    expect(invitationLine("2026-11-25T04:00:00Z", "Asia/Kuala_Lumpur", now)).toBe("Invite expires 25 Nov");
    expect(invitationLine("2026-11-17T04:00:00Z", "Asia/Kuala_Lumpur", now)).toBe("Invite expired 17 Nov");
    expect(invitationLine(null, "Asia/Kuala_Lumpur", now)).toBe("Invite sent");
  });

  test("names roles and first names", () => {
    const roles = [{ slug: "owner", name: "Owner", permissions: [], grantable: true }];
    expect(roleName(roles, "owner")).toBe("Owner");
    expect(roleName(roles, "receptionist")).toBe("Receptionist");
    expect(firstName("Daniel Wong")).toBe("Daniel");
    expect(firstName("siti@example.com")).toBe("siti@example.com");
  });

  test("offers only grantable roles, and none for a member the viewer cannot change", () => {
    const roles = [
      { slug: "owner", name: "Owner", permissions: ["staff:manage", "settings:manage"], grantable: false },
      { slug: "manager", name: "Manager", permissions: ["staff:manage"], grantable: true },
    ];
    const member = { manageable: true } as never;
    expect(roleChoices(member, roles).map((role) => role.slug)).toEqual(["manager"]);
    expect(roleChoices({ manageable: false } as never, roles)).toEqual([]);
  });

  test("never shows permission codes from a refusal", () => {
    const grant = staffChangeFailure(failure("staff_change_refused", "You cannot grant owner: it includes settings:manage, which you do not hold."), "Daniel Wong");
    expect(grant).toEqual({ text: "Daniel's access changed elsewhere. Reload the page.", reload: true });
    expect(staffChangeFailure(failure("staff_change_refused", "At least one active member must keep staff:manage."), "Daniel Wong").text).toBe(
      "Someone else must keep the right to manage staff.",
    );
    expect(staffChangeFailure(failure("not_found"), "Daniel Wong").reload).toBe(true);
    expect(staffChangeFailure(failure("forbidden"), "Daniel Wong").text).not.toContain(":");
    expect(staffChangeFailure(failure("workos_unavailable", "WorkOS is not available."), "Daniel Wong")).toEqual({
      text: "Staff sign-in is not answering. Try again in a moment.",
      reload: false,
    });
  });

  test("puts a refused email on the field", () => {
    expect(inviteFailure(failure("staff_change_refused", "Enter a valid email address.")).field).toBeDefined();
    expect(inviteFailure(failure("staff_change_refused", "You cannot grant owner: it includes x.")).text).not.toContain(":");
    expect(inviteFailure(failure("api_unreachable"))).toEqual({});
  });
});

describe("roles view", () => {
  const manager = { permissions: ["purchases:create", "purchases:read", "check_ins:read", "staff:manage"] };
  const ability = (label: string) => ABILITIES.find((item) => item.label === label)!;

  test("reads each cell from the role's permissions", () => {
    expect(reach(manager, ability("Invite and change staff"))).toBe("all");
    expect(reach(manager, ability("Change settings and locations"))).toBe("none");
    expect(reach(manager, ability("Create sales and record payments"))).toBe("some");
  });

  test("a task that needs every permission is all or nothing", () => {
    expect(reach({ permissions: ["purchases:read"] }, ability("See reports"))).toBe("none");
    expect(reach(manager, ability("See reports"))).toBe("all");
  });
});

describe("general facts", () => {
  test("names a time zone with its offset, as in Paper", () => {
    const now = new Date("2026-11-18T04:00:00Z");
    expect(zoneLabel("Asia/Kuala_Lumpur", now)).toBe("Kuala Lumpur (GMT+8)");
    expect(zoneLabel("UTC", now)).toBe("UTC (GMT)");
  });

  test("keeps the organization's own zone in the list", () => {
    expect(zoneChoices("America/Lima")[0]).toBe("America/Lima");
    expect(zoneChoices("UTC")).not.toContain("America/Lima");
  });

  test("says what the save bar holds", () => {
    expect(changeSummary({ timezone: true, published: false })).toBe("Time zone changed");
    expect(changeSummary({ timezone: true, published: true })).toBe("2 changes");
  });

  test("says a taken location name in Paper's words", () => {
    expect(locationFieldError(["has already been taken"], "Name", " Bangsar ")).toBe("Another location is already called Bangsar");
    expect(locationFieldError(["can't be blank"], "Name", "")).toBe("Enter a name");
    expect(locationFieldError(undefined, "Name", "x")).toBeUndefined();
    expect(locationCount(1)).toBe("1 location");
    expect(gymSiteAddress("chainsaw")).toBe("chainsaw.flowfokus.com");
  });
});
