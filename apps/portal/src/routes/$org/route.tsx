import { Link, Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { DoorOpen, Package, Receipt, Users } from "lucide-react";
import { AccessUnavailable } from "../../components/AccessUnavailable";
import { FailureNotice } from "../../components/ui";
import { getAccess, getStaffOrganization } from "../../lib/staff.functions";
import { isSlug } from "../../lib/validate";

export const Route = createFileRoute("/$org")({
  beforeLoad: ({ params }) => {
    if (!isSlug(params.org)) throw notFound();
  },
  loader: async ({ params }) => {
    const access = await getAccess();
    if (access.kind !== "demo") return { access, organization: null };
    const organization = await getStaffOrganization({ data: { slug: params.org } });
    return { access, organization };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData?.organization?.ok === true
            ? `${loaderData.organization.data.name} · Hydraflow staff`
            : "Hydraflow staff portal",
      },
    ],
  }),
  component: OrganizationLayout,
});

function OrganizationLayout() {
  const { access, organization } = Route.useLoaderData();
  const { org } = Route.useParams();

  if (access.kind !== "demo") {
    return (
      <Blocked title="Staff access is turned off">
        <AccessUnavailable reason={access.reason} />
      </Blocked>
    );
  }
  if (!organization?.ok) {
    return (
      <Blocked title={`Cannot open “${org}”`}>
        {organization ? <FailureNotice error={organization.error} title="The organization did not open" /> : null}
      </Blocked>
    );
  }

  const data = organization.data;
  const nav = [
    { to: "/$org", label: "Front desk", icon: DoorOpen, exact: true },
    { to: "/$org/members", label: "Members", icon: Users, exact: false },
    { to: "/$org/sales", label: "Sales", icon: Receipt, exact: false },
    { to: "/$org/products", label: "Offers", icon: Package, exact: false },
  ] as const;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="rail" aria-label="Organization">
        <div className="org-plate">
          <span className="org-plate__name">{data.name}</span>
          <span className="org-plate__meta">
            {data.locations.length === 1 ? "1 location" : `${data.locations.length} locations`} · {data.currency}
          </span>
        </div>
        <nav className="nav" aria-label="Staff pages">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              params={{ org: data.slug }}
              activeOptions={{ exact: item.exact }}
              activeProps={{ "aria-current": "page", className: "is-active" }}
            >
              <item.icon aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="rail__foot">
          {data.actor.demo ? <span className="demo-tag">Local demo</span> : null}
          <span className="actor">
            Signed in as <strong>{data.actor.name}</strong>
          </span>
          <Link to="/" className="actor">
            Change organization
          </Link>
        </div>
      </aside>
      <main className="main" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

function Blocked({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="entry" id="main">
      <div className="entry__panel">
        <h1>{title}</h1>
        {children}
        <p>
          <Link to="/">Back to the organization list</Link>
        </p>
      </div>
    </main>
  );
}
