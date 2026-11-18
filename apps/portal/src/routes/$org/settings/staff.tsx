import { createFileRoute } from "@tanstack/react-router";
import { Staff } from "../../../features/settings/Staff";
import { getTeam } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/settings/staff")({
  loader: ({ params }) => getTeam({ data: { slug: params.org } }),
  component: StaffPage,
});

function StaffPage() {
  return <Staff team={Route.useLoaderData()} />;
}
