import { useState, type FormEvent } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { LogIn, LogOut } from "lucide-react";
import { formatMoney, formatUsage } from "../lib/format";
import { useGym } from "../lib/site";
import { getAccountPage, submitLinkCode } from "../lib/site.functions";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  loader: () => getAccountPage(),
  component: Account,
});

const DENIAL: Record<Schemas["DenialReason"], string> = {
  no_entitlement: "No active membership",
  location_not_allowed: "Not valid at this location",
  usage_limit_reached: "No visits left",
};

function useDates() {
  const { organization } = useGym();
  const date = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: organization.timezone });
  const dateTime = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: organization.timezone });
  return { date: (iso: string) => date.format(new Date(iso)), dateTime: (iso: string) => dateTime.format(new Date(iso)) };
}

function Account() {
  const page = Route.useLoaderData();
  const { organization } = useGym();

  if (page.kind === "off") {
    return (
      <Shell title="Member sign-in is not available here">
        <p>For questions about your membership, ask at the front desk.</p>
      </Shell>
    );
  }
  if (page.kind === "signed_out") {
    return (
      <Shell title="Sign in to see your account">
        <p>Your account shows your membership, visits left, and payments at {organization.name}.</p>
        <div className="actions">
          <a className="button" href="/auth/start?returnTo=/account">
            <LogIn aria-hidden="true" />
            Sign in
          </a>
        </div>
      </Shell>
    );
  }
  if (page.kind === "error") {
    return (
      <Shell title="Your account did not load">
        <div className="notice" data-tone="error" role="alert">
          <span className="lamp" data-state="denied" aria-hidden="true" />
          <p className="notice__title">Something went wrong</p>
          <p className="notice__body">{page.message}</p>
        </div>
      </Shell>
    );
  }
  if (page.kind === "not_linked") {
    return (
      <Shell title={`Link your account to ${organization.name}`} signedInAs={page.person.email}>
        <p>Ask the front desk for a link code. It proves this sign-in belongs to you. Each code works once and expires after seven days.</p>
        <LinkForm />
      </Shell>
    );
  }

  return <AccountView person={page.person} account={page.account} />;
}

function Shell({ title, signedInAs, children }: { title: string; signedInAs?: string; children: React.ReactNode }) {
  return (
    <section className="message account" aria-labelledby="account-heading">
      <div className="wrap">
        <h1 id="account-heading">{title}</h1>
        {children}
        {signedInAs ? <SignOut email={signedInAs} /> : null}
      </div>
    </section>
  );
}

function SignOut({ email }: { email: string }) {
  return (
    <form method="post" action="/sign-out" className="account__signout">
      <span className="field__hint">Signed in as {email}</span>
      <button type="submit" className="button button--quiet">
        <LogOut aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}

function LinkForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Enter the code from the front desk.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await submitLinkCode({ data: { code } });
      if (result.ok) {
        await router.invalidate();
        return;
      }
      setError(result.code === "rate_limited" ? "Too many tries. Wait a few minutes, then try again." : result.message);
    } catch {
      setError("The code was not sent. Reload the page and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="account__link" onSubmit={onSubmit} noValidate>
      <label htmlFor="link-code">Link code</label>
      <input
        id="link-code"
        className="input"
        value={code}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={40}
        placeholder="XXXX-XXXX-XXXX"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "link-code-error" : undefined}
        onChange={(event) => setCode(event.target.value)}
      />
      {error ? (
        <p id="link-code-error" className="account__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="actions">
        <button type="submit" className="button" disabled={pending} aria-busy={pending || undefined}>
          {pending ? "Linking…" : "Link my account"}
        </button>
      </div>
    </form>
  );
}

function AccountView({ person, account }: { person: { name: string; email: string }; account: Schemas["MemberAccount"] }) {
  const { organization } = useGym();
  const { date, dateTime } = useDates();
  const current = account.current_period;
  const upcoming = (account.membership?.periods ?? []).filter((period) => !period.revoked_at && Date.parse(period.starts_at) > Date.now());

  return (
    <section className="account" aria-labelledby="account-heading">
      <div className="wrap">
        <h1 id="account-heading">Hello, {account.name}</h1>
        <div className="plate account__status">
          {current ? (
            <>
              <p className="status">
                <span className="lamp" data-state="active" aria-hidden="true" />
                Membership active
              </p>
              <p>
                Until {date(current.ends_at)}.
                {upcoming.length ? ` Renewed: the next period starts ${date(upcoming[0]!.starts_at)}.` : " Renew at the front desk before it ends."}
              </p>
            </>
          ) : (
            <>
              <p className="status">
                <span className="lamp" data-state="off" aria-hidden="true" />
                No active membership
              </p>
              <p>
                {upcoming.length ? `Your next period starts ${date(upcoming[0]!.starts_at)}.` : `Buy a membership at the ${organization.name} front desk.`}{" "}
                <Link to="/" hash="offers">
                  See memberships
                </Link>
              </p>
            </>
          )}
        </div>

        <h2>Your access</h2>
        {account.entitlements.length ? (
          <ul className="rights">
            {account.entitlements.map((right) => (
              <li key={right.id} className="right plate">
                <div className="right__head">
                  <strong>{right.name}</strong>
                  <span className="status">
                    <span className="lamp" data-state={right.active ? "active" : "waiting"} aria-hidden="true" />
                    {right.active ? "Active" : `Starts ${date(right.starts_at)}`}
                  </span>
                </div>
                <p>
                  {right.usage_limit === null ? formatUsage(null) : `${right.remaining} of ${right.usage_limit} visits left`} ·{" "}
                  {right.location_id === null ? "All locations" : "One location"} · until {date(right.ends_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No access rights right now.</p>
        )}

        <h2>Recent visits</h2>
        {account.check_ins.length ? (
          <ul className="account__list">
            {account.check_ins.map((visit) => (
              <li key={visit.id}>
                <span className="lamp" data-state={visit.result === "granted" ? "granted" : "denied"} aria-hidden="true" />
                <span>
                  {visit.overridden
                    ? "Let in by staff"
                    : visit.result === "granted"
                      ? "Checked in"
                      : `Not let in: ${visit.denial_reason ? DENIAL[visit.denial_reason] : "denied"}`}{" "}
                  at{" "}
                  {visit.location_name}
                </span>
                <time dateTime={visit.checked_in_at} suppressHydrationWarning>
                  {dateTime(visit.checked_in_at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No visits yet.</p>
        )}

        <h2>Purchases</h2>
        {account.sales.length ? (
          <ul className="account__list">
            {account.sales.map((sale) => (
              <li key={sale.id}>
                <span className="lamp" data-state={sale.balance_minor > 0 ? "due" : "paid"} aria-hidden="true" />
                <span>
                  {sale.product_name}, {sale.price_label}: {formatMoney(sale.total_minor, sale.currency)}
                  {sale.balance_minor > 0 ? ` · ${formatMoney(sale.balance_minor, sale.currency)} still due` : " · paid"}
                  {sale.refunded_minor > 0 ? ` · ${formatMoney(sale.refunded_minor, sale.currency)} refunded` : ""}
                </span>
                <time dateTime={sale.purchased_at} suppressHydrationWarning>
                  {date(sale.purchased_at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">No purchases yet.</p>
        )}
        <p className="field__hint">Payments are made at the front desk. This page shows what the desk recorded.</p>
        <SignOut email={person.email} />
      </div>
    </section>
  );
}
