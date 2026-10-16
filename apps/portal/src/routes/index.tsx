import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogIn, Waves } from "lucide-react";
import { AccessUnavailable } from "../components/AccessUnavailable";
import { Field, describedBy } from "../components/ui";
import { getAccess, getStaffOrganization } from "../lib/staff.functions";
import { isSlug } from "../lib/validate";

/** The seeded organization the local demo actor belongs to. */
const DEMO_SLUG = "chainsaw";

export const Route = createFileRoute("/")({
  loader: async () => {
    const access = await getAccess();
    if (access.kind !== "demo") return { access, demoOrganization: null };
    const organization = await getStaffOrganization({ data: { slug: DEMO_SLUG } });
    return { access, demoOrganization: organization };
  },
  component: Home,
});

function Home() {
  const { access, demoOrganization } = Route.useLoaderData();

  return (
    <main className="entry" id="main">
      <div className="entry__panel">
        <p className="wordmark">
          <Waves aria-hidden="true" />
          Hydraflow
        </p>
        <div className="page-head__text">
          <h1>Staff portal</h1>
          <p>Members, membership sales, payments, and check-ins for your gym.</p>
        </div>

        {access.kind === "demo" ? (
          <>
            <section className="plate" aria-labelledby="demo-heading">
              <div className="plate__head">
                <h2 id="demo-heading">Local demo</h2>
                <span className="demo-tag">Local development only</span>
              </div>
              <div className="plate__body">
                <p>
                  You act as the seeded Demo Owner. This is not a real sign-in, and it is turned off in
                  production builds.
                </p>
              </div>
              {demoOrganization?.ok ? (
                <Link to="/$org" params={{ org: demoOrganization.data.slug }} className="org-link">
                  <span className="org-link__name">{demoOrganization.data.name}</span>
                  <ArrowRight aria-hidden="true" />
                  <span className="org-link__meta">
                    {demoOrganization.data.locations.map((location) => location.name).join(" · ")}
                  </span>
                </Link>
              ) : (
                <div className="plate__body">
                  <p>
                    The API did not answer for <strong>{DEMO_SLUG}</strong>. Start Rails and seed the database,
                    then reload.
                  </p>
                  {demoOrganization ? (
                    <p className="field__hint">{demoOrganization.error.message}</p>
                  ) : null}
                </div>
              )}
            </section>
            <OpenBySlug />
          </>
        ) : (
          <section className="plate" aria-labelledby="sign-in-heading">
            <div className="plate__head">
              <h2 id="sign-in-heading">Sign in</h2>
            </div>
            <div className="plate__body">
              <AccessUnavailable reason={access.reason} />
              <div className="actions">
                <button type="button" className="button" disabled aria-describedby="sign-in-off">
                  <LogIn aria-hidden="true" />
                  Sign in with WorkOS
                </button>
                <span id="sign-in-off" className="field__hint">
                  Turned off until sign-in is configured.
                </span>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function OpenBySlug() {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | undefined>();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = slug.trim().toLowerCase();
    if (!isSlug(value)) {
      setError("Enter a gym address name, for example chainsaw. Use lowercase letters, numbers, and hyphens.");
      return;
    }
    setError(undefined);
    void navigate({ to: "/$org", params: { org: value } });
  }

  const hint = "The demo actor has staff access to chainsaw only. Other gyms show an access error.";
  return (
    <form className="plate form" onSubmit={onSubmit} noValidate aria-labelledby="open-heading">
      <div className="plate__head">
        <h2 id="open-heading">Open another organization</h2>
      </div>
      <div className="plate__body form">
        <Field id="org-slug" label="Organization address name" hint={hint} error={error}>
          <input
            id="org-slug"
            className="input"
            name="slug"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy("org-slug", hint, error)}
          />
        </Field>
        <div className="actions">
          <button type="submit" className="button button--quiet">
            Open
          </button>
        </div>
      </div>
    </form>
  );
}
