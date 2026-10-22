import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccessUnavailable } from "../components/AccessUnavailable";
import { Blocked } from "../components/Blocked";
import { OrganizationChoices, SignInLink, SignOutForm } from "../components/Session";
import { FailureNotice, Notice } from "../components/ui";
import { getAccess, listMyOrganizations } from "../lib/staff.functions";

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
 * - Signed in with one organization: opens it.
 * - Signed in with more: a list to choose from.
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
    if (organizations.ok && organizations.data.length === 1) {
      throw redirect({ to: "/$org", params: { org: organizations.data[0]!.slug }, replace: true });
    }
    return { view: "choose", user, organizations } as const;
  },
  component: Start,
});

function Start() {
  const data = Route.useLoaderData();

  if (data.view === "unavailable") {
    return (
      <Blocked title="Staff access is turned off" description="Nothing in the portal can open until staff sign-in is set up.">
        <AccessUnavailable reason={data.reason} />
      </Blocked>
    );
  }

  if (data.view === "signed_out") {
    return (
      <Blocked title="Sign in to the staff portal" description="Use your staff account. You choose the organization after you sign in.">
        {data.failed ? (
          <Notice tone="error" title="Sign-in did not finish" live>
            <p>The sign-in link expired or was already used. Start again.</p>
          </Notice>
        ) : null}
        <div className="actions">
          <SignInLink />
        </div>
      </Blocked>
    );
  }

  const { user, organizations } = data;
  if (!organizations.ok) {
    return (
      <Blocked title="Your organizations did not load" description={`Signed in as ${user.email}.`}>
        <FailureNotice error={organizations.error} title="The list did not load" />
        <div className="actions">
          <SignOutForm />
        </div>
      </Blocked>
    );
  }

  if (organizations.data.length === 0) {
    return (
      <Blocked title="No staff access yet" description={`Signed in as ${user.email}.`}>
        <Notice tone="warning" title="You are not staff at any organization">
          <p>Ask an owner to add you as staff, then sign in again.</p>
        </Notice>
        <div className="actions">
          <SignOutForm />
        </div>
      </Blocked>
    );
  }

  return (
    <Blocked title="Choose an organization" description={`Signed in as ${user.email}. You can switch later from the top bar.`}>
      <OrganizationChoices organizations={organizations.data} />
      <div className="actions">
        <SignOutForm />
      </div>
    </Blocked>
  );
}
