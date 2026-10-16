import { getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");

/** The gym for this host. Child routes render only when the root found one. */
export function useGym() {
  const page = rootRoute.useLoaderData();
  if (page.kind !== "gym") throw new Error("Gym is not loaded");
  return page;
}
