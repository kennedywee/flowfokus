import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccessUnavailable } from "../components/AccessUnavailable";
import { Blocked } from "../components/Blocked";
import { getAccess } from "../lib/staff.functions";

/** The seeded organization the local demo actor belongs to. */
const DEMO_SLUG = "chainsaw";

/**
 * The portal start has no page of its own. The local demo opens its one
 * organization. Without staff access, it says why nothing can open.
 */
export const Route = createFileRoute("/")({
  loader: async () => {
    const access = await getAccess();
    if (access.kind === "demo") throw redirect({ to: "/$org", params: { org: DEMO_SLUG }, replace: true });
    return { access };
  },
  component: Start,
});

function Start() {
  const { access } = Route.useLoaderData();
  return (
    <Blocked title="Staff access is turned off" description="Nothing in the portal can open until staff sign-in is set up.">
      <AccessUnavailable reason={access.reason} />
    </Blocked>
  );
}
