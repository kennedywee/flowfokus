import { getRouteApi } from "@tanstack/react-router";

const orgRoute = getRouteApi("/$org");

/**
 * The staff organization for the current page. Child routes render only after
 * the layout has loaded it, so it is always present there.
 */
export function useOrganization() {
  const { organization } = orgRoute.useLoaderData();
  if (!organization?.ok) throw new Error("Organization is not loaded");
  return organization.data;
}

export function useLocationName() {
  const organization = useOrganization();
  return (id: string | null) =>
    id === null ? "All locations" : (organization.locations.find((location) => location.id === id)?.name ?? "Unknown location");
}
