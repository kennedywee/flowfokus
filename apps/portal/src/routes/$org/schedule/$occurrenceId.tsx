import { createFileRoute } from "@tanstack/react-router";
import { sessionName } from "../../../features/schedule/facts";
import { SessionDetails, SessionDidNotLoad, SessionLoading } from "../../../features/schedule/SessionDetails";
import { failureMessage } from "../../../lib/format";
import { getRoster } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Roster = Awaited<ReturnType<typeof getRoster>>;
type Loaded = Roster & { loadedAt: number };

export const Route = createFileRoute("/$org/schedule/$occurrenceId")({
  // `loadedAt` is the one clock for the server render and the first browser render.
  loader: async ({ params }): Promise<Loaded> => {
    const loadedAt = Date.now();
    if (!isUuid(params.occurrenceId)) {
      return { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Session not found" }, loadedAt };
    }
    return { ...(await getRoster({ data: { slug: params.org, id: params.occurrenceId } })), loadedAt };
  },
  // Paper puts a session under its program: Programs › Morning strength › Thu 5 Nov, 07:00.
  staticData: {
    section: "/$org/programs",
    trail: (data, timeZone) => {
      const loaded = data as Loaded | undefined;
      if (!loaded?.ok) return [{ label: "Session" }];
      return [
        { label: loaded.data.program.name, program: loaded.data.program.id },
        { label: sessionName(loaded.data.starts_at, timeZone) },
      ];
    },
  },
  pendingComponent: SessionLoading,
  component: SessionPage,
});

function SessionPage() {
  const loaded = Route.useLoaderData();
  if (!loaded.ok) {
    return <SessionDidNotLoad notFound={loaded.error.code === "not_found"} message={failureMessage(loaded.error)} />;
  }
  return <SessionDetails roster={loaded.data} loadedAt={loaded.loadedAt} />;
}
