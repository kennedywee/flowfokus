import { Link, createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import type { Schemas } from "@hydraflow/api";
import { CheckInPanel } from "../../../components/CheckInPanel";
import { SalesTable } from "../../../components/SalesTable";
import { Empty, FailureNotice, Lamp, Notice, PageHead, Plate, SkeletonRows, Status } from "../../../components/ui";
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
      <div className="page">
        <Crumbs />
        <FailureNotice error={record.error} title="This member did not load" />
      </div>
    );
  }

  const { member, sales, checkIns } = record.data;
  return (
    <div className="page">
      <Crumbs />
      <PageHead title={member.name} description={member.email}>
        <Link
          to="/$org/sales/new"
          params={{ org: organization.slug }}
          search={{ member: member.id }}
          className="button"
        >
          <ShoppingBag aria-hidden="true" />
          Sell a membership
        </Link>
      </PageHead>

      <div className="grid-2">
        <Access member={member} />
        <Plate title="Check in">
          <CheckInPanel fixedMember={member} />
        </Plate>
      </div>

      <Plate title="Sales" description="Newest first. Open a sale to record payment or deliver it.">
        {sales.length ? (
          <SalesTable sales={sales} showMember={false} />
        ) : (
          <Empty title="No sales yet">
            <p>Sell a membership to give this member access.</p>
          </Empty>
        )}
      </Plate>

      <div className="grid-2">
        <Periods member={member} />
        <Plate title="Check-in history">
          {checkIns.length ? <CheckInHistory checkIns={checkIns} /> : <Empty title="No check-ins yet" />}
        </Plate>
      </div>
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

function Access({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const period = member.current_period;
  const rights = member.entitlements;

  return (
    <Plate title="Access now">
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
                <Status state={right.active ? "active" : "off"}>{right.active ? "Valid now" : "Starts later"}</Status>
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
          <p>Rights appear after a paid sale is delivered.</p>
        </Notice>
      )}
    </Plate>
  );
}

function Periods({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const periods = member.membership?.periods ?? [];
  const now = Date.now();
  return (
    <Plate title="Membership periods" description="Each period comes from one delivered sale. Periods never overlap.">
      {periods.length ? (
        <ol className="timeline">
          {[...periods].reverse().map((period) => {
            const starts = Date.parse(period.starts_at);
            const ends = Date.parse(period.ends_at);
            const state = now >= ends ? "ended" : now >= starts ? "current" : "upcoming";
            return (
              <li key={period.id}>
                <Lamp state={state === "current" ? "active" : "off"} />
                <span>
                  {formatDate(period.starts_at, organization.timezone)} to {formatDate(period.ends_at, organization.timezone)}
                  <span className="cell-sub">
                    <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: period.sale_id }}>
                      View sale
                    </Link>
                  </span>
                </span>
                <span className="cell-sub">{state === "current" ? "Current" : state === "upcoming" ? "Upcoming" : "Ended"}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty title="No membership yet">
          <p>The first delivered sale creates the membership and its first period.</p>
        </Empty>
      )}
    </Plate>
  );
}

function CheckInHistory({ checkIns }: { checkIns: Schemas["CheckIn"][] }) {
  const organization = useOrganization();
  const locationName = useLocationName();
  return (
    <ol className="timeline">
      {checkIns.map((checkIn) => (
        <li key={checkIn.id}>
          <Lamp state={checkIn.result} />
          <span>
            {checkIn.result === "granted"
              ? "Granted"
              : `Denied: ${checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "no reason"}`}
            <span className="cell-sub">{locationName(checkIn.location_id)}</span>
          </span>
          <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
            {formatWhen(checkIn.checked_in_at, organization.timezone)}
          </time>
        </li>
      ))}
    </ol>
  );
}

