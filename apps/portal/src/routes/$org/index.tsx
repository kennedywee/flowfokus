import type { Schemas } from "@flowfokus/api";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { CheckInPanel } from "../../components/CheckInPanel";
import { Avatar, Empty, FailureNotice, PageHead, Plate, SkeletonRows, Status } from "../../components/ui";
import { DENIAL, formatWhen } from "../../lib/format";
import { useLocationName, useOrganization } from "../../lib/organization";
import { getOverview, listCheckIns, listMembers } from "../../lib/staff.functions";
import { buttonVariants } from "@/components/ui/button";

const RECENT_LIMIT = 12;

export const Route = createFileRoute("/$org/")({
  loader: async ({ params }) => {
    const slug = params.org;
    const [overview, members, checkIns] = await Promise.all([
      getOverview({ data: { slug } }),
      listMembers({ data: { slug } }),
      listCheckIns({ data: { slug } }),
    ]);
    return { overview, members, checkIns };
  },
  pendingComponent: () => <SkeletonRows rows={6} />,
  component: FrontDesk,
});

function FrontDesk() {
  const { overview, members, checkIns } = Route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  const showLocation = organization.locations.length > 1;

  return (
    <div className="page desk-page">
      <PageHead title="Overview">
        <Link to="/$org/sales/new" params={{ org: organization.slug }} className={buttonVariants()}>
          <Plus aria-hidden="true" strokeWidth={1.75} />
          New sale
        </Link>
      </PageHead>

      <div className="grid-2 grid-2--wide-first">
        <div className="stack">
          <Plate title="Check in">
            {members.ok ? (
              members.data.length ? (
                <CheckInPanel members={members.data} />
              ) : (
                <Empty title="No members yet">
                  <Link
                    to="/$org/members"
                    params={{ org: organization.slug }}
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    Add a member
                  </Link>
                </Empty>
              )
            ) : (
              <FailureNotice error={members.error} title="Members did not load" />
            )}
          </Plate>

          {overview.ok ? (
            <OverviewCounts counts={overview.data} slug={organization.slug} />
          ) : (
            <FailureNotice error={overview.error} title="Counts did not load" />
          )}
        </div>

        <Plate title="Recent check-ins" flush>
          {checkIns.ok ? (
            checkIns.data.length ? (
              <ol className="desk-recent">
                {checkIns.data.slice(0, RECENT_LIMIT).map((checkIn) => (
                  <li key={checkIn.id}>
                    <Avatar name={checkIn.member.name} size={32} />
                    <span className="desk-recent__who">
                      <Link
                        to="/$org/members/$memberId"
                        params={{ org: organization.slug, memberId: checkIn.member.id }}
                        className="cell-title"
                      >
                        {checkIn.member.name}
                      </Link>
                      <span className="cell-sub">
                        {showLocation ? locationName(checkIn.location_id) : null}
                        {showLocation && (checkIn.result === "denied" || checkIn.override_reason) ? " · " : null}
                        {checkIn.override_reason ? (
                          <span className="desk-recent__reason" data-tone="override">
                            Let in by staff
                          </span>
                        ) : null}
                        {checkIn.result === "denied" ? (
                          <span className="desk-recent__reason">
                            {checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "No reason given"}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="desk-recent__when">
                      <Status state={checkIn.result}>{checkIn.result === "granted" ? "Granted" : "Denied"}</Status>
                      <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                        {formatWhen(checkIn.checked_in_at, organization.timezone)}
                      </time>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty title="No check-ins yet" />
            )
          ) : (
            <FailureNotice error={checkIns.error} title="Check-ins did not load" />
          )}
        </Plate>
      </div>
    </div>
  );
}

/** Read-only totals and direct links to the work behind each count. */
function OverviewCounts({ counts, slug }: { counts: Schemas["StaffOverview"]; slug: string }) {
  const today = counts.check_ins_today;
  return (
    <dl className="desk-summary">
      <div>
        <dt>Check-ins today</dt>
        <dd>{today.granted + today.denied}</dd>
        <span className="desk-summary__detail">
          {today.granted} granted · {today.denied} denied
        </span>
      </div>
      <div>
        <dt>
          <Link to="/$org/members" params={{ org: slug }}>
            Members <ArrowRight aria-hidden="true" />
          </Link>
        </dt>
        <dd>{counts.member_count}</dd>
        <span className="desk-summary__detail">{counts.active_membership_count} with access</span>
      </div>
      <div>
        <dt>
          <Link to="/$org/sales" params={{ org: slug }} search={{ payment: "unpaid,partial" }}>
            Unpaid sales <ArrowRight aria-hidden="true" />
          </Link>
        </dt>
        <dd>{counts.unpaid_sale_count}</dd>
      </div>
      <div>
        <dt>
          <Link to="/$org/sales" params={{ org: slug }} search={{ payment: "paid", delivery: "waiting" }}>
            Awaiting delivery <ArrowRight aria-hidden="true" />
          </Link>
        </dt>
        <dd>{counts.awaiting_fulfillment_count}</dd>
      </div>
    </dl>
  );
}
