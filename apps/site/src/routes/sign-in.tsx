import { Link, createFileRoute } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useGym } from "../lib/site";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SignIn,
});

function SignIn() {
  const { organization } = useGym();
  return (
    <section className="message" aria-labelledby="sign-in-heading">
      <div className="wrap">
        <h1 id="sign-in-heading">Member sign-in is not available yet</h1>
        <p>
          Online accounts for {organization.name} members are coming in a later release. Your membership, payments, and
          visits are already recorded by the front desk.
        </p>
        <div className="notice" data-tone="warning">
          <span className="lamp" data-state="due" aria-hidden="true" />
          <p className="notice__title">Sign-in is turned off</p>
          <p className="notice__body">For questions about your membership, ask at the front desk.</p>
        </div>
        <div className="actions">
          <button type="button" className="button" disabled aria-describedby="sign-in-off">
            <LogIn aria-hidden="true" />
            Sign in
          </button>
          <span id="sign-in-off" className="field__hint">
            Turned off until member sign-in is available.
          </span>
        </div>
        <p>
          <Link to="/">Back to {organization.name}</Link>
        </p>
      </div>
    </section>
  );
}
