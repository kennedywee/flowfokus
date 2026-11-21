import { createFileRoute, redirect } from "@tanstack/react-router";
import { General } from "../../../features/settings/General";
import { SettingsIndexList } from "../../../features/settings/SettingsNav";
import { sectionFromOldLink } from "../../../features/settings/sections";
import { redirectToStart } from "../../../lib/start-redirect";

/**
 * The settings start. Phones show the list of sections; wider screens show
 * General beside the settings sidebar. Old `?section=Team` links still open
 * their section.
 */
export const Route = createFileRoute("/$org/settings/")({
  validateSearch: (search: Record<string, unknown>): { section?: string } =>
    typeof search.section === "string" ? { section: search.section } : {},
  beforeLoad: ({ search, params }) => {
    const to = sectionFromOldLink(search.section);
    if (to) throw redirect({ to, params: { org: params.org }, replace: true });
  },
  // Integrations left the product, like its page. It opens the first page the person can read.
  loaderDeps: ({ search }) => ({ section: search.section?.trim().toLowerCase() }),
  loader: ({ params, deps, parentMatchPromise }) =>
    deps.section === "integrations" ? redirectToStart(params.org, parentMatchPromise) : null,
  component: SettingsStart,
});

function SettingsStart() {
  const { org } = Route.useParams();
  return (
    <>
      <div className="settings-start--phone">
        <SettingsIndexList slug={org} />
      </div>
      <div className="settings-start--wide">
        <General />
      </div>
    </>
  );
}
