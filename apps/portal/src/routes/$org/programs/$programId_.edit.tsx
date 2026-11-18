import { createFileRoute } from "@tanstack/react-router";
import { ProgramDidNotLoad, ProgramLoading } from "../../../features/programs/ProgramDetails";
import { ProgramForm } from "../../../features/programs/ProgramForm";
import { failureMessage } from "../../../lib/format";
import { getProgram } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Loaded = Awaited<ReturnType<typeof getProgram>>;

/** Paper "Edit program": the New program page with Save changes, without Kind and Schedule. */
export const Route = createFileRoute("/$org/programs/$programId_/edit")({
  loader: ({ params }): Promise<Loaded> => {
    if (!isUuid(params.programId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Program not found" } });
    }
    return getProgram({ data: { slug: params.org, id: params.programId } });
  },
  // Programs › Morning strength, as in Paper.
  staticData: {
    crumb: (data) => {
      const loaded = data as Loaded | undefined;
      return loaded?.ok ? loaded.data.name : undefined;
    },
  },
  pendingComponent: ProgramLoading,
  component: EditProgramPage,
});

function EditProgramPage() {
  const program = Route.useLoaderData();
  if (!program.ok) {
    return <ProgramDidNotLoad notFound={program.error.code === "not_found"} message={failureMessage(program.error)} />;
  }
  // A new key per program, so the form starts from the saved values after each save.
  return <ProgramForm key={program.data.id} program={program.data} />;
}
