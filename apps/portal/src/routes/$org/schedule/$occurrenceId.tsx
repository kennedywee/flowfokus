import { createFileRoute } from "@tanstack/react-router";
import { sessionName } from "../../../features/schedule/facts";
import { SessionDetails, SessionDidNotLoad, SessionLoading } from "../../../features/schedule/SessionDetails";
import { failureMessage } from "../../../lib/format";
import { getRoster } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

type Loaded = Awaited<ReturnType<typeof getRoster>>;

export const Route = createFileRoute("/$org/schedule/$occurrenceId")({
  loader: ({ params }): Promise<Loaded> => {
    if (!isUuid(params.occurrenceId)) {
      return Promise.resolve({ ok: false as const, error: { status: 404, code: "not_found" as const, message: "Session not found" } });
    }
    return getRoster({ data: { slug: params.org, id: params.occurrenceId } });
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
  const roster = Route.useLoaderData();
  if (!roster.ok) {
    return <SessionDidNotLoad notFound={roster.error.code === "not_found"} message={failureMessage(roster.error)} />;
  }
  return <SessionDetails roster={roster.data} />;
}
