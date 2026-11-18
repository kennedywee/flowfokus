import { createFileRoute } from "@tanstack/react-router";
import { readProgramsSearch, type ProgramsSearch } from "../../../features/programs/facts";
import { ProgramsList, ProgramsLoading } from "../../../features/programs/ProgramsList";
import { listPrograms } from "../../../lib/staff.functions";

export const Route = createFileRoute("/$org/programs/")({
  validateSearch: (search: Record<string, unknown>): ProgramsSearch => readProgramsSearch(search),
  loader: ({ params }) => listPrograms({ data: { slug: params.org } }),
  pendingComponent: ProgramsLoading,
  component: ProgramsPage,
});

function ProgramsPage() {
  const programs = Route.useLoaderData();
  const search = Route.useSearch();
  return <ProgramsList programs={programs} search={search} />;
}
