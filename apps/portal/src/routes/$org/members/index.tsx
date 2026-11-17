import { createFileRoute } from "@tanstack/react-router";
import { MembersList, MembersListLoading } from "../../../features/members/MembersList";
import { listMembers } from "../../../lib/staff.functions";

interface MembersSearch {
  q?: string;
}

export const Route = createFileRoute("/$org/members/")({
  validateSearch: (search: Record<string, unknown>): MembersSearch => {
    const q = typeof search.q === "string" ? search.q.trim().slice(0, 200) : "";
    return q ? { q } : {};
  },
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ params, deps }) => listMembers({ data: { slug: params.org, ...(deps.q ? { q: deps.q } : {}) } }),
  pendingComponent: MembersListLoading,
  component: MembersPage,
});

function MembersPage() {
  const members = Route.useLoaderData();
  const { q } = Route.useSearch();
  return <MembersList members={members} q={q} />;
}
