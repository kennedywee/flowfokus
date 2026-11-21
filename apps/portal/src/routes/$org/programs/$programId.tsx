import { createFileRoute } from "@tanstack/react-router";
import { ProgramDetails, ProgramDidNotLoad, ProgramLoading } from "../../../features/programs/ProgramDetails";
import { HISTORY_DAYS } from "../../../features/programs/sessions";
import { shiftDay } from "../../../features/schedule/facts";
import { failureMessage } from "../../../lib/format";
import { getProgram, listSchedule } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Program = Awaited<ReturnType<typeof getProgram>>;
type History = Awaited<ReturnType<typeof listSchedule>>;
type Loaded = Program & { history: History | null; loadedAt: number };

export const Route = createFileRoute("/$org/programs/$programId")({
  // `loadedAt` is the one clock for the server render and the first browser render.
  loader: async ({ params }): Promise<Loaded> => {
    const loadedAt = Date.now();
    if (!isUuid(params.programId)) {
      return { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Program not found" }, history: null, loadedAt };
    }
    // Rails sends a program's times from the start of today. The schedule adds the earlier ones, for
    // the chart and the past sessions. It starts a day early, so the gym's own "today" is always covered.
    const from = shiftDay(new Date(loadedAt).toISOString().slice(0, 10), -(HISTORY_DAYS - 2));
    const [program, history] = await Promise.all([
      getProgram({ data: { slug: params.org, id: params.programId } }),
      listSchedule({ data: { slug: params.org, from, days: HISTORY_DAYS } }),
    ]);
    return { ...program, history, loadedAt };
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
  const loaded = Route.useLoaderData();
  if (!loaded.ok) {
    return <ProgramDidNotLoad notFound={loaded.error.code === "not_found"} message={failureMessage(loaded.error)} />;
  }
  return <ProgramDetails program={loaded.data} history={loaded.history?.ok ? loaded.history.data : null} loadedAt={loaded.loadedAt} />;
}
