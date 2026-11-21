import { createFileRoute, redirect } from "@tanstack/react-router";

/** The old address of the Calendar, from before it replaced Schedule. Keeps the program filter. */
export const Route = createFileRoute("/$org/schedule/")({
  beforeLoad: ({ params, search }) => {
    const program = typeof (search as { program?: unknown }).program === "string" ? (search as { program: string }).program : undefined;
    throw redirect({ to: "/$org/calendar", params: { org: params.org }, search: (program ? { program } : {}) as never, replace: true });
  },
});
