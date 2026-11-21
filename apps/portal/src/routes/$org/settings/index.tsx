import { createFileRoute } from "@tanstack/react-router";
import { settingsFromOldLink } from "../../../features/settings/sections";
import { redirectToSettings, redirectToStart } from "../../../lib/start-redirect";

/**
 * Settings is a dialog over a page (`?settings=staff`). This address opens it
 * over the first page the person can read. Old `?section=Team` links still
 * open their page. A role that can read no page keeps this empty page behind
 * the dialog. Closing it here adds `?closed=true`, so the empty page stays.
 */
export const Route = createFileRoute("/$org/settings/")({
  validateSearch: (search: Record<string, unknown>): { section?: string; closed?: true } => ({
    ...(typeof search.section === "string" ? { section: search.section } : {}),
    ...(search.closed === true || search.closed === "true" ? { closed: true as const } : {}),
  }),
  loaderDeps: ({ search }) => ({
    section: search.section?.trim().toLowerCase(),
    settings: search.settings,
    closed: search.closed === true,
  }),
  loader: ({ params, deps, parentMatchPromise }) => {
    // Integrations left the product, like its page. It opens the first page the person can read.
    if (deps.section === "integrations") return redirectToStart(params.org, parentMatchPromise);
    const page = settingsFromOldLink(deps.section) ?? deps.settings ?? "general";
    const stay = !deps.section && (deps.settings !== undefined || deps.closed);
    return redirectToSettings(params.org, page, parentMatchPromise, stay);
  },
  component: () => null,
});
