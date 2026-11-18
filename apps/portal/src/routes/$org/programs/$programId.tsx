import { createFileRoute } from "@tanstack/react-router";
import { ProgramDetails, ProgramDidNotLoad, ProgramLoading } from "../../../features/programs/ProgramDetails";
import { failureMessage } from "../../../lib/format";
import { getProgram } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Loaded = Awaited<ReturnType<typeof getProgram>>;

export const Route = createFileRoute("/$org/programs/$programId")({
  loader: ({ params }): Promise<Loaded> => {
    if (!isUuid(params.programId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Program not found" } });
    }
    return getProgram({ data: { slug: params.org, id: params.programId } });
  },
  // The top bar breadcrumb ends with the program's name.
  staticData: {
    crumb: (data) => {
      const loaded = data as Loaded | undefined;
      return loaded?.ok ? loaded.data.name : undefined;
    },
  },
  pendingComponent: ProgramLoading,
  component: ProgramPage,
});

function ProgramPage() {
  const program = Route.useLoaderData();
  if (!program.ok) {
    return <ProgramDidNotLoad notFound={program.error.code === "not_found"} message={failureMessage(program.error)} />;
  }
  return <ProgramDetails program={program.data} />;
}
