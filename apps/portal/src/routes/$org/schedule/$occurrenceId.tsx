import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old address of a session page, from before the Calendar replaced Schedule. */
export const Route = createFileRoute("/$org/schedule/$occurrenceId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$org/calendar/$occurrenceId", params, replace: true });
  },
});
