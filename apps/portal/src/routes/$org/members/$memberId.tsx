import { Link, createFileRoute } from "@tanstack/react-router";
import { CalendarRange, History, KeyRound, ShoppingBag, UserRound } from "lucide-react";
import type { Schemas } from "@flowfokus/api";
import { CheckInPanel } from "../../../components/CheckInPanel";
import { SalesTable } from "../../../components/SalesTable";
import {
  Empty,
  FailureNotice,
  Notice,
  PageHead,
  Plate,
  SkeletonRows,
  Status,
  buttonClass,
  type LampState,
} from "../../../components/ui";
import { DENIAL, formatDate, formatUsage, formatWhen } from "../../../lib/format";
import { useLocationName, useOrganization } from "../../../lib/organization";
import { getMemberRecord } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";

export const Route = createFileRoute("/$org/members/$memberId")({
  loader: async ({ params }) => {
    if (!isUuid(params.memberId)) {
      return { ok: false as const, error: { status: 404, code: "not_found" as const, message: "Member not found" } };
    }
    return getMemberRecord({ data: { slug: params.org, id: params.memberId } });
  },
  pendingComponent: () => <SkeletonRows rows={8} />,
  component: MemberPage,
});

function MemberPage() {
  const record = Route.useLoaderData();
  const organization = useOrganization();

  if (!record.ok) {
    return (
      <div className="page member-page">
        <Crumbs />
        <FailureNotice error={record.error} title="This member did not load" />
      </div>
    );
  }

  const { member, sales, checkIns } = record.data;
  return (
    <div className="page member-page">
      <Crumbs />
      <PageHead title={member.name}>
        <Link
          to="/$org/sales/new"
          params={{ org: organization.slug }}
          search={{ member: member.id }}
          className={buttonClass()}
        >
          <ShoppingBag aria-hidden="true" />
          Sell a membership
        </Link>
      </PageHead>

      <Details member={member} />

      <div className="grid-2">
        <Access member={member} />
        <Plate title="Check in" icon={<KeyRound />}>
          <CheckInPanel fixedMember={member} />
        </Plate>
      </div>

      <Plate
        title="Sales"
        description="Newest first. Open a sale to record payment or deliver it."
        icon={<ShoppingBag />}
        flush
      >
        {sales.length ? (
          <SalesTable sales={sales} showMember={false} />
        ) : (
          <div className="member-state">
            <Empty title="No sales yet">
              <p>Sell a membership to give this member access.</p>
              <Link
                to="/$org/sales/new"
                params={{ org: organization.slug }}
                search={{ member: member.id }}
                className={buttonClass({ variant: "secondary", size: "small" })}
              >
                Sell a membership
              </Link>
            </Empty>
          </div>
        )}
      </Plate>

      <Periods member={member} />

      <Plate title="Check-in history" icon={<History />} flush>
        {checkIns.length ? (
          <CheckInHistory checkIns={checkIns} />
        ) : (
          <div className="member-state">
            <Empty title="No check-ins yet">
              <p>Check this member in above. Each attempt, granted or denied, appears here.</p>
            </Empty>
          </div>
        )}
      </Plate>
    </div>
  );
}

function Crumbs() {
  const organization = useOrganization();
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <Link to="/$org/members" params={{ org: organization.slug }}>
        Members
      </Link>
      <span aria-hidden="true">/</span>
    </nav>
  );
}

function Details({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  return (
    <Plate title="Details" icon={<UserRound />}>
      <dl className="facts">
        <div>
          <dt>Email</dt>
          <dd>{member.email}</dd>
        </div>
        <div>
          <dt>Added</dt>
          <dd>
            <time dateTime={member.created_at} suppressHydrationWarning>
              {formatDate(member.created_at, organization.timezone)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Membership started</dt>
          <dd>
            {member.membership ? (
              <time dateTime={member.membership.created_at} suppressHydrationWarning>
                {formatDate(member.membership.created_at, organization.timezone)}
              </time>
            ) : (
              <span className="muted">No membership yet</span>
            )}
          </dd>
        </div>
      </dl>
    </Plate>
  );
}

function Access({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const period = member.current_period;
  const rights = member.entitlements;

  return (
    <Plate title="Access now" icon={<KeyRound />}>
      {period ? (
        <Status state="active">
          Covered from {formatDate(period.starts_at, organization.timezone)} until{" "}
          {formatDate(period.ends_at, organization.timezone)}
        </Status>
      ) : (
        <Status state="off">No membership period covers today</Status>
      )}
      {rights.length ? (
        <ul className="rights">
          {rights.map((right) => (
            <li key={right.id} className="right">
              <div className="right__head">
                <span className="cell-title">{right.name}</span>
                <Status state={right.active ? "active" : "waiting"}>{right.active ? "Valid now" : "Starts later"}</Status>
              </div>
              <span className="cell-sub">
                {locationName(right.location_id)} · {formatUsage(right.usage_limit)} ·{" "}
                {formatDate(right.starts_at, organization.timezone)} to {formatDate(right.ends_at, organization.timezone)}
              </span>
              {right.usage_limit !== null && right.remaining !== null ? (
                <div className="meter" data-state={right.remaining === 0 ? "due" : undefined}>
                  <div
                    className="meter__track"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={right.usage_limit}
                    aria-valuenow={right.remaining}
                    aria-label={`${right.name}: visits left`}
                  >
                    <div className="meter__fill" style={{ transform: `scaleX(${right.usage_limit ? right.remaining / right.usage_limit : 0})` }} />
                  </div>
                  <span className="cell-sub">
                    {right.remaining} of {right.usage_limit} visits left · {right.used_count} used
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Notice title="No access rights">
          <p>Rights appear after a paid sale is delivered. Record payment on a sale, then select Deliver membership.</p>
        </Notice>
      )}
    </Plate>
  );
}

const PERIOD_STATE: Record<"current" | "upcoming" | "ended", { lamp: LampState; label: string }> = {
  current: { lamp: "active", label: "Current" },
  upcoming: { lamp: "waiting", label: "Upcoming" },
  ended: { lamp: "off", label: "Ended" },
};

function Periods({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const periods = member.membership?.periods ?? [];
  const now = Date.now();
  return (
    <Plate
      title="Membership periods"
      description="Each period comes from one delivered sale. Periods never overlap."
      icon={<CalendarRange />}
      flush
    >
      {periods.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Starts</th>
                <th scope="col">Ends</th>
                <th scope="col">State</th>
                <th scope="col">Sale</th>
              </tr>
            </thead>
            <tbody>
              {[...periods].reverse().map((period) => {
                const starts = Date.parse(period.starts_at);
                const ends = Date.parse(period.ends_at);
                const state = now >= ends ? "ended" : now >= starts ? "current" : "upcoming";
                return (
                  <tr key={period.id}>
                    <td className="member-date">
                      <time dateTime={period.starts_at} suppressHydrationWarning>
                        {formatDate(period.starts_at, organization.timezone)}
                      </time>
                    </td>
                    <td className="member-date">
                      <time dateTime={period.ends_at} suppressHydrationWarning>
                        {formatDate(period.ends_at, organization.timezone)}
                      </time>
                    </td>
                    <td>
                      <Status state={PERIOD_STATE[state].lamp}>{PERIOD_STATE[state].label}</Status>
                    </td>
                    <td>
                      <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: period.sale_id }}>
                        View sale
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="member-state">
          <Empty title="No membership yet">
            <p>The first delivered sale creates the membership and its first period.</p>
          </Empty>
        </div>
      )}
    </Plate>
  );
}

function CheckInHistory({ checkIns }: { checkIns: Schemas["CheckIn"][] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Result</th>
            <th scope="col">Reason</th>
            <th scope="col">Location</th>
            <th scope="col" className="num">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {checkIns.map((checkIn) => (
            <tr key={checkIn.id}>
              <td>
                <Status state={checkIn.result}>{checkIn.result === "granted" ? "Granted" : "Denied"}</Status>
              </td>
              <td className="muted">
                {checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : checkIn.result === "granted" ? "Access valid" : "No reason recorded"}
              </td>
              <td>{locationName(checkIn.location_id)}</td>
              <td className="num member-date">
                <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                  {formatWhen(checkIn.checked_in_at, organization.timezone)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
