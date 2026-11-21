import { redirect } from "@tanstack/react-router";
import type { Permission } from "@flowfokus/api";
import { startPage } from "./pages";

/** What a child route can read from the organization layout (routes/$org/route.tsx). */
type OrganizationMatch = {
  loaderData?: {
    organization: { ok: true; data: { actor: { permissions: Permission[] } } } | { ok: false } | null;
  };
};

/**
 * Sends the person to the first page in the sidebar they can read: Calendar,
 * then Members, Sales, Programs, Products, and Settings when they can read
 * none. It is one redirect, so old URLs and `/<org>` land on the page at once.
 * Returns when the organization did not open, because the layout then shows its
 * own screen. Call it from a loader, after the layout has loaded.
 */
export async function redirectToStart(slug: string, parentMatch: Promise<OrganizationMatch>): Promise<null> {
  const organization = (await parentMatch).loaderData?.organization;
  if (!organization?.ok) return null;
  const page = startPage(organization.data.actor.permissions);
  throw redirect({ to: page?.to ?? "/$org/settings", params: { org: slug }, replace: true });
}
