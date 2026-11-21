import type { TeamRole } from "./team";

/*
 * Paper "Settings — Roles": what each role can do. The roles and their
 * permissions come from WorkOS through Rails (`/staff/team`), so the table
 * follows any change there. This file only names groups of permissions in
 * staff words; it never says which role holds what.
 */

export interface Ability {
  label: string;
  permissions: string[];
}

export const ABILITIES: readonly Ability[] = [
  { label: "Check in members", permissions: ["check_ins:create"] },
  { label: "Let members in after a denial", permissions: ["check_ins:override"] },
  { label: "Add members", permissions: ["members:create"] },
  { label: "Create sales and record payments", permissions: ["purchases:create", "payments:create"] },
  { label: "Fulfill sales", permissions: ["purchases:fulfill"] },
  { label: "Refund and void sales", permissions: ["purchases:refund", "purchases:void"] },
  { label: "Book members into sessions", permissions: ["bookings:create"] },
  { label: "Manage programs and sessions", permissions: ["programs:manage"] },
  { label: "Manage products and prices", permissions: ["products:create", "products:update"] },
  { label: "Change settings and locations", permissions: ["settings:manage"] },
  { label: "Invite and change staff", permissions: ["staff:manage"] },
];

export type Reach = "all" | "some" | "none";

/** How much of an ability a role holds. */
export function reach(role: Pick<TeamRole, "permissions">, ability: Ability): Reach {
  const held = ability.permissions.filter((permission) => role.permissions.includes(permission)).length;
  if (held === ability.permissions.length) return "all";
  if (held === 0) return "none";
  return "some";
}
