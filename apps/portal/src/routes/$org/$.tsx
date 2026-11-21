import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isRemovedPage, START_PAGE } from "../../lib/removed-pages";

/** The last route to match. Old URLs of removed pages open the start page. Any other address is not found. */
export const Route = createFileRoute("/$org/$")({
  beforeLoad: ({ params, location }) => {
    if (isRemovedPage(location.pathname, params.org)) throw redirect({ to: START_PAGE, params: { org: params.org }, replace: true });
    throw notFound();
  },
});
