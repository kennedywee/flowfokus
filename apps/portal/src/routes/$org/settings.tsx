import { createFileRoute } from "@tanstack/react-router";
import { getTeam } from "../../lib/staff.functions";
import { SETTINGS_SECTIONS, Settings, type SettingsSection } from "../../features/preview/Settings";

interface SettingsSearch {
  section?: SettingsSection;
}

/** A section name from the URL, in any letter case. Anything else opens Organization. */
function sectionFrom(value: unknown): SettingsSection | undefined {
  if (typeof value !== "string") return undefined;
  return SETTINGS_SECTIONS.find((section) => section.toLowerCase() === value.toLowerCase());
}

export const Route = createFileRoute("/$org/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    const section = sectionFrom(search.section);
    return section ? { section } : {};
  },
  loaderDeps: ({ search }) => ({ section: search.section }),
  loader: ({ params, deps }) => (deps.section === "Team" ? getTeam({ data: { slug: params.org } }) : null),
  component: SettingsRoute,
});

function SettingsRoute() {
  const section = sectionFrom(Route.useSearch().section) ?? "Organization";
  const navigate = Route.useNavigate();
  const team = Route.useLoaderData();
  return <Settings team={team} section={section} onSection={(next) => void navigate({ search: next === "Organization" ? {} : { section: next }, replace: true })} />;
}
