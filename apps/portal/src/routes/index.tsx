import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccessUnavailable } from "../components/AccessUnavailable";
import { Blocked } from "../components/Blocked";
import { OrganizationChoices, SignInLink } from "../components/Session";
import { getAccess, listMyOrganizations } from "../lib/staff.functions";
import { startOrganization } from "../lib/start";

/** The seeded organization the local demo actor belongs to. */
const DEMO_SLUG = "chainsaw";

interface StartSearch {
  /** Set by the callback when WorkOS sign-in did not finish. */
  sign_in?: "failed";
}

/**
 * The portal start.
 *
 * - Signed out: a sign-in button.
 * - Signed in: opens the organization the session holds, which the user
 *   picked at WorkOS sign-in. With one organization, opens that one.
 * - Signed in with more and none held by the session: a list to choose from.
 * - The local demo opens its one organization.
 * - Without staff access, it says why nothing can open.
 */
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): StartSearch =>
    search.sign_in === "failed" ? { sign_in: "failed" } : {},
  loaderDeps: ({ search }) => ({ failed: search.sign_in === "failed" }),
  loader: async ({ deps }) => {
    const { access, user } = await getAccess();
    if (access.kind === "demo") throw redirect({ to: "/$org", params: { org: DEMO_SLUG }, replace: true });
    if (access.kind === "unavailable") return { view: "unavailable", reason: access.reason } as const;
    if (!user) return { view: "signed_out", failed: deps.failed } as const;

    const organizations = await listMyOrganizations();
    if (!organizations.ok && organizations.error.code === "signed_out") {
      return { view: "signed_out", failed: false } as const;
    }
    const slug = organizations.ok ? startOrganization(organizations.data) : null;
    if (slug) throw redirect({ to: "/$org", params: { org: slug }, replace: true });
    return { view: "choose", user, organizations } as const;
  },
  component: Start,
});

function Start() {
  const data = Route.useLoaderData();

  if (data.view === "unavailable") return <AccessUnavailable reason={data.reason} />;

  // Paper "Sign in — portal start" and "Sign in — Did not finish". The password is typed at WorkOS.
  if (data.view === "signed_out") {
    return (
      <Blocked
        title="Sign in to Flowfokus"
        tone={data.failed ? "error" : undefined}
        message={data.failed ? "Sign-in did not finish. The link expired or was already used. Sign in again." : undefined}
      >
        <SignInLink />
      </Blocked>
    );
  }

  const { user, organizations } = data;
  if (!organizations.ok) {
    return <Blocked title="Your organizations did not load" tone="error" message="Reload the page to try again." account={user.email} />;
  }

  if (organizations.data.length === 0) {
    return (
      <Blocked
        title="No staff access yet"
        message="You are not staff at any organization. Ask an owner to invite you, then sign in again."
        account={user.email}
      />
    );
  }

  return (
    <Blocked title="Choose an organization" account={user.email}>
      <OrganizationChoices organizations={organizations.data} />
    </Blocked>
  );
}
