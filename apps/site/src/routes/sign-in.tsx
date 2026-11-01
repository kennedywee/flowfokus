import { Link, createFileRoute } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useGym, useSession } from "../lib/site";

interface SignInSearch {
  failed?: boolean;
}

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => (search.failed ? { failed: true } : {}),
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SignIn,
});

function SignIn() {
  const { organization } = useGym();
  const session = useSession();
  const { failed } = Route.useSearch();

  if (!session.signInOn) {
    return (
      <section className="message" aria-labelledby="sign-in-heading">
        <div className="wrap">
          <h1 id="sign-in-heading">Member sign-in is not available here</h1>
          <p>Your membership, payments, and visits are still recorded by the front desk.</p>
          <div className="notice" data-tone="warning">
            <span className="lamp" data-state="due" aria-hidden="true" />
            <p className="notice__title">Sign-in is turned off</p>
            <p className="notice__body">This site has no sign-in settings. For questions about your membership, ask at the front desk.</p>
          </div>
          <p>
            <Link to="/">Back to {organization.name}</Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="message" aria-labelledby="sign-in-heading">
      <div className="wrap">
        <h1 id="sign-in-heading">Sign in to your {organization.name} account</h1>
        <p>See your membership, visits left, and payments. The first time, the front desk gives you a code to link your account.</p>
        {failed ? (
          <div className="notice" data-tone="error" role="alert">
            <span className="lamp" data-state="denied" aria-hidden="true" />
            <p className="notice__title">Sign-in did not finish</p>
            <p className="notice__body">Nothing was saved. Try again.</p>
          </div>
        ) : null}
        <div className="actions">
          {session.person ? (
            <Link to="/account" className="button">
              Open your account
            </Link>
          ) : (
            <a className="button" href="/auth/start?returnTo=/account">
              <LogIn aria-hidden="true" />
              Sign in
            </a>
          )}
        </div>
        <p>
          <Link to="/">Back to {organization.name}</Link>
        </p>
      </div>
    </section>
  );
}
