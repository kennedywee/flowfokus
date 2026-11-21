import { createFileRoute } from "@tanstack/react-router";
import { settingsFromOldLink } from "../../../features/settings/sections";
import { redirectToSettings, redirectToStart } from "../../../lib/start-redirect";

/**
 * Settings is a dialog over a page (`?settings=staff`). This address opens it
 * over the first page the person can read. Old `?section=Team` links still
 * open their page. A role that can read no page keeps this empty page behind
 * the dialog.
 */
export const Route = createFileRoute("/$org/settings/")({
  validateSearch: (search: Record<string, unknown>): { section?: string } =>
    typeof search.section === "string" ? { section: search.section } : {},
  loaderDeps: ({ search }) => ({ section: search.section?.trim().toLowerCase(), settings: search.settings }),
  loader: ({ params, deps, parentMatchPromise }) => {
    // Integrations left the product, like its page. It opens the first page the person can read.
    if (deps.section === "integrations") return redirectToStart(params.org, parentMatchPromise);
    const page = settingsFromOldLink(deps.section) ?? deps.settings ?? "general";
    return redirectToSettings(params.org, page, parentMatchPromise, deps.section ? undefined : deps.settings);
  },
  component: () => null,
});
