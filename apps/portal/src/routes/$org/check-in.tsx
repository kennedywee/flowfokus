import { createFileRoute } from "@tanstack/react-router";
import { CheckIns } from "../../features/preview/CheckIns";
import { listCheckIns, listMembers } from "../../lib/staff.functions";

export const Route = createFileRoute("/$org/check-in")({
  loader: async ({ params }) => {
    const [members, visits] = await Promise.all([
      listMembers({ data: { slug: params.org } }),
      listCheckIns({ data: { slug: params.org } }),
    ]);
    return { members, visits };
  },
  component: CheckIns,
});
