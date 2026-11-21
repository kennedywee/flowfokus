import { createFileRoute, notFound } from "@tanstack/react-router";
import { isRemovedPage } from "../../lib/removed-pages";
import { redirectToStart } from "../../lib/start-redirect";

/**
 * The last route to match. Old URLs of removed pages open the first page the
 * person can read, as `/<org>` does. Any other address is not found.
 */
export const Route = createFileRoute("/$org/$")({
  beforeLoad: ({ params, location }) => {
    if (!isRemovedPage(location.pathname, params.org)) throw notFound();
  },
  loader: ({ params, parentMatchPromise }) => redirectToStart(params.org, parentMatchPromise),
});
