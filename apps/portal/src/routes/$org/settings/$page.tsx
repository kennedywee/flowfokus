import { createFileRoute, notFound } from "@tanstack/react-router";
import { settingsFromOldLink } from "../../../features/settings/sections";
import { redirectToSettings, redirectToStart } from "../../../lib/start-redirect";

/**
 * Old settings addresses, such as `/<org>/settings/staff`. Each opens the
 * Settings dialog on its page. Integrations left the product.
 */
export const Route = createFileRoute("/$org/settings/$page")({
  loader: ({ params, parentMatchPromise }) => {
    if (params.page === "integrations") return redirectToStart(params.org, parentMatchPromise);
    const page = settingsFromOldLink(params.page);
    if (!page) throw notFound();
    return redirectToSettings(params.org, page, parentMatchPromise);
  },
});
