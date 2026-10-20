import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseSoonPage } from "../../lib/soon";

const DESTINATIONS = {
  inbox: "/$org/inbox", agents: "/$org/agents", "check-in": "/$org/check-in",
  reports: "/$org/reports", settings: "/$org/settings", branches: "/$org/branches", changelog: "/$org/changelog",
} as const;

/** Keep bookmarks to the old placeholder URLs working. */
export const Route = createFileRoute("/$org/soon")({
  validateSearch: (search: Record<string, unknown>) => ({ page: parseSoonPage(search.page) }),
  beforeLoad: ({ params, search, location }) => {
    throw redirect({ to: search.page ? DESTINATIONS[search.page] : "/$org", params: { org: params.org }, hash: location.hash, replace: true });
  },
});
