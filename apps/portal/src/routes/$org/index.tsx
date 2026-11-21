import { createFileRoute } from "@tanstack/react-router";
import { redirectToStart } from "../../lib/start-redirect";

/**
 * `/<org>` has no page of its own. It opens the first page in the sidebar that
 * the person can read: Calendar, then Members, Sales, Programs, Products. A role
 * that can read none opens Settings. Rails still checks every request.
 */
export const Route = createFileRoute("/$org/")({
  // `/<org>?settings=roles` keeps its settings page.
  loaderDeps: ({ search }) => ({ settings: search.settings }),
  loader: ({ params, deps, parentMatchPromise }) => redirectToStart(params.org, parentMatchPromise, deps.settings),
});
