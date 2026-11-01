import { createFileRoute } from "@tanstack/react-router";
import { getTeam } from "../../lib/staff.functions";
import { SETTINGS_SECTIONS, Settings, type SettingsSection } from "../../features/preview/Settings";

interface SettingsSearch {
  section?: SettingsSection;
}

export const Route = createFileRoute("/$org/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch =>
    SETTINGS_SECTIONS.includes(search.section as SettingsSection) ? { section: search.section as SettingsSection } : {},
  loaderDeps: ({ search }) => ({ section: search.section }),
  loader: ({ params, deps }) => (deps.section === "Team" ? getTeam({ data: { slug: params.org } }) : null),
  component: SettingsRoute,
});

function SettingsRoute() {
  const { section = "Organization" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const team = Route.useLoaderData();
  return <Settings team={team} section={section} onSection={(next) => void navigate({ search: next === "Organization" ? {} : { section: next }, replace: true })} />;
}
