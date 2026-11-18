import type { Schemas } from "@flowfokus/api";
import type { Failure } from "../../lib/result";
import { failureMessage } from "../../lib/format";

export type TeamMember = Schemas["TeamMember"];
export type TeamInvitation = Schemas["TeamInvitation"];
export type TeamRole = Schemas["TeamRole"];

/** "Daniel" from "Daniel Wong". An email stays whole. */
export function firstName(name: string): string {
  if (name.includes("@")) return name;
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * The members to list. WorkOS adds a pending membership with each
 * invitation, so a pending member with an invitation for the same email
 * shows once, as the invitation.
 */
export function listedMembers(team: Pick<Schemas["Team"], "members" | "invitations">): TeamMember[] {
  const invited = new Set(team.invitations.map((invitation) => invitation.email.toLowerCase()));
  return team.members.filter((member) => !(member.status === "pending" && invited.has(member.email.toLowerCase())));
}

/** Paper counts pending invitations as staff: "5 staff". */
export function staffCount(team: Pick<Schemas["Team"], "members" | "invitations">): string {
  return `${listedMembers(team).length + team.invitations.length} staff`;
}

/**
 * The status mark for a member who is not active, in Paper's style: a
 * coloured icon with grey text. Active members show no mark.
 */
export function memberStatus(status: TeamMember["status"]): { label: string; tone: "warning" | "muted" } | null {
  if (status === "pending") return { label: "Not synced yet", tone: "warning" };
  if (status === "inactive") return { label: "Inactive", tone: "muted" };
  return null;
}

function shortDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-MY", { timeZone, day: "numeric", month: "short" }).format(new Date(iso));
}

/**
 * The line under a pending invitation. Rails gives the expiry, not the day it
 * was sent, so the line says when the invite expires.
 */
export function invitationLine(expiresAt: string | null, timeZone: string, now: Date = new Date()): string {
  if (!expiresAt) return "Invite sent";
  const when = shortDate(expiresAt, timeZone);
  return new Date(expiresAt).getTime() <= now.getTime() ? `Invite expired ${when}` : `Invite expires ${when}`;
}

/** A role's name for an invitation, which holds the role slug only. */
export function roleName(roles: TeamRole[], slug: string | null): string {
  if (!slug) return "Default role";
  return roles.find((role) => role.slug === slug)?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

/**
 * The roles a person may choose for a member: the ones the viewer may grant.
 * A member the viewer cannot change gets none, so the row has no role menu.
 */
export function roleChoices(member: TeamMember, roles: TeamRole[]): TeamRole[] {
  if (!member.manageable) return [];
  return roles.filter((role) => role.grantable);
}

/** The codes Rails uses when it refuses a staff change, or the record changed. */
const REFUSED = new Set(["staff_change_refused", "workos_rejected", "not_found", "forbidden", "validation_failed"]);

/**
 * A staff change Rails did not make, in staff words. Rails messages can name
 * permission codes, so they are never shown as they are. `reload` is true when
 * the list on screen is out of date and the page should reload it.
 */
export function staffChangeFailure(
  error: Failure,
  name: string,
  kind: "member" | "invitation" = "member",
): { text: string; reload: boolean } {
  if (!REFUSED.has(error.code)) return { text: failureMessage(error), reload: false };
  const message = error.message.toLowerCase();
  if (error.code === "forbidden") return { text: "Your role cannot change staff. Reload the page.", reload: true };
  if (message.includes("must keep")) return { text: "Someone else must keep the right to manage staff.", reload: false };
  if (message.includes("own access")) return { text: "You cannot change your own access.", reload: false };
  if (message.includes("not synced")) return { text: `${firstName(name)} has not finished joining. Try again in a moment.`, reload: false };
  if (message.includes("only a pending invitation")) return { text: "This invitation is no longer pending. Reload the page.", reload: true };
  if (kind === "invitation") return { text: "It changed elsewhere. Reload the page.", reload: true };
  return { text: `${firstName(name)}'s access changed elsewhere. Reload the page.`, reload: true };
}

/**
 * An invitation Rails did not send, in staff words. The email check is ours,
 * so its message is shown on the field instead.
 */
export function inviteFailure(error: Failure): { field?: string; text?: string } {
  if (error.code === "staff_change_refused" && /email/i.test(error.message)) {
    return { field: "Enter an email address, for example name@example.com" };
  }
  if (error.code === "staff_change_refused" || error.code === "forbidden") {
    return { text: "Your role cannot give this role. Choose another." };
  }
  if (error.code === "workos_rejected") {
    return { text: "This email cannot be invited. It may already be staff or invited." };
  }
  return {};
}
