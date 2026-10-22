import type { Schemas } from "@flowfokus/api";

/** An organization the signed-in user can open. No WorkOS IDs reach the browser. */
export interface StaffOrganizationChoice {
  slug: string;
  name: string;
  role: string;
  /**
   * True for the organization the session holds now: the one picked at
   * WorkOS sign-in or the last switch. It only picks where the start page
   * goes. Rails still checks every request.
   */
  active: boolean;
}

/**
 * Turns Rails memberships into safe choices for the browser. Drops the WorkOS
 * organization ID and marks the one that matches the session. Server code only
 * knows `sessionOrganizationId`.
 */
export function toOrganizationChoices(
  memberships: Schemas["StaffMembership"][],
  sessionOrganizationId: string | null,
): StaffOrganizationChoice[] {
  return memberships.map(({ slug, name, role, workos_organization_id }) => ({
    slug,
    name,
    role,
    active: sessionOrganizationId !== null && workos_organization_id === sessionOrganizationId,
  }));
}

/**
 * The organization the start page opens, or null when the user must choose
 * (or has none). The session's organization comes first, then the only one.
 */
export function startOrganization(organizations: StaffOrganizationChoice[]): string | null {
  const active = organizations.find((organization) => organization.active);
  if (active) return active.slug;
  return organizations.length === 1 ? organizations[0]!.slug : null;
}
