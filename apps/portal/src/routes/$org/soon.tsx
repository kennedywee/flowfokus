import { Link, createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { Empty, PageHead, buttonClass } from "../../components/ui";
import { SOON_PAGES, parseSoonPage } from "../../lib/soon";

export const Route = createFileRoute("/$org/soon")({
  validateSearch: (search: Record<string, unknown>) => ({ page: parseSoonPage(search.page) }),
  component: Soon,
});

/** The stand-in for sidebar sections that are not built yet. */
function Soon() {
  const { org } = Route.useParams();
  const { page } = Route.useSearch();
  const name = page ? SOON_PAGES[page] : "This page";

  return (
    <div className="page">
      <PageHead title={page ? SOON_PAGES[page] : "Coming soon"} />
      <Empty title={`${name} is not built yet`} icon={Hammer}>
        <p>The staff portal does not have this section yet. Daily work happens on the Overview page.</p>
        <Link to="/$org" params={{ org }} activeOptions={{ exact: true }} className={buttonClass({ variant: "secondary" })}>
          Back to Overview
        </Link>
      </Empty>
    </div>
  );
}
