import { createFileRoute, redirect } from "@tanstack/react-router";
import { START_PAGE } from "../../lib/removed-pages";

/** `/<org>` has no page of its own. It opens the schedule. */
export const Route = createFileRoute("/$org/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: START_PAGE, params: { org: params.org }, replace: true });
  },
});
