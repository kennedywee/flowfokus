import { createFileRoute } from "@tanstack/react-router";
import { Roles } from "../../../features/settings/Roles";
import { getTeam } from "../../../lib/staff.functions";

/** Roles and their permissions come with the staff list, from WorkOS through Rails. */
export const Route = createFileRoute("/$org/settings/roles")({
  loader: ({ params }) => getTeam({ data: { slug: params.org } }),
  component: RolesPage,
});

function RolesPage() {
  return <Roles team={Route.useLoaderData()} />;
}
