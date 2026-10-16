import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckInPanel } from "../../components/CheckInPanel";
import { Empty, FailureNotice, Lamp, PageHead, Plate, SkeletonRows } from "../../components/ui";
import { DENIAL, formatWhen } from "../../lib/format";
import { useLocationName, useOrganization } from "../../lib/organization";
import { getOverview, listCheckIns, listMembers } from "../../lib/staff.functions";

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

  return (
    <div className="page">
      <PageHead title="Front desk" description="Check members in. Then follow up on sales that need payment or delivery." />

      <div className="grid-2">
        <Plate title="Check in">
          {members.ok ? (
            members.data.length ? (
              <CheckInPanel members={members.data} />
            ) : (
              <Empty title="No members yet">
                <p>Add a member before the first check-in.</p>
                <Link to="/$org/members" params={{ org: organization.slug }} className="button button--quiet">
                  Add a member
                </Link>
              </Empty>
            )
          ) : (
            <FailureNotice error={members.error} title="Members did not load" />
          )}
        </Plate>

        <div className="stack">
          <Plate title="Needs attention">
            {overview.ok ? (
              <ul className="counter-list">
                <li>
                  <Link to="/$org/sales" params={{ org: organization.slug }} search={{ view: "due" }} className="counter">
                    <Lamp state={overview.data.unpaid_sale_count ? "due" : "off"} />
                    <span className="counter__label">Sales with a balance due</span>
                    <span className="counter__value">{overview.data.unpaid_sale_count}</span>
                  </Link>
                </li>
                <li>
                  <Link to="/$org/sales" params={{ org: organization.slug }} search={{ view: "deliver" }} className="counter">
                    <Lamp state={overview.data.awaiting_fulfillment_count ? "waiting" : "off"} />
                    <span className="counter__label">Paid sales waiting for delivery</span>
                    <span className="counter__value">{overview.data.awaiting_fulfillment_count}</span>
                  </Link>
                </li>
                <li>
                  <Link to="/$org/members" params={{ org: organization.slug }} className="counter">
                    <Lamp state="off" />
                    <span className="counter__label">
                      Members, {overview.data.active_membership_count} with access now
                    </span>
                    <span className="counter__value">{overview.data.member_count}</span>
                  </Link>
                </li>
              </ul>
            ) : (
              <FailureNotice error={overview.error} title="Counts did not load" />
            )}
          </Plate>

          <Plate
            title="Recent check-ins"
            description={
              overview.ok
                ? `Today: ${overview.data.check_ins_today.granted} granted, ${overview.data.check_ins_today.denied} denied`
                : undefined
            }
          >
            {checkIns.ok ? (
              checkIns.data.length ? (
                <ol className="timeline">
                  {checkIns.data.slice(0, RECENT_LIMIT).map((checkIn) => (
                    <li key={checkIn.id}>
                      <Lamp state={checkIn.result} />
                      <span>
                        <Link
                          to="/$org/members/$memberId"
                          params={{ org: organization.slug, memberId: checkIn.member.id }}
                          className="cell-title"
                        >
                          {checkIn.member.name}
                        </Link>
                        <span className="cell-sub">
                          {checkIn.result === "granted" ? "Granted" : `Denied: ${checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "no reason"}`}
                          {" · "}
                          {locationName(checkIn.location_id)}
                        </span>
                      </span>
                      <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                        {formatWhen(checkIn.checked_in_at, organization.timezone)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty title="No check-ins yet">
                  <p>Each check-in appears here with its result and location.</p>
                </Empty>
              )
            ) : (
              <FailureNotice error={checkIns.error} title="Check-ins did not load" />
            )}
          </Plate>
        </div>
      </div>
    </div>
  );
}
