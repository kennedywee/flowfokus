import type { ReactNode } from "react";
import type { Schemas } from "@flowfokus/api";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, CircleCheck, Clock, Users } from "lucide-react";
import { CheckInPanel } from "../../components/CheckInPanel";
import { Avatar, Empty, FailureNotice, PageHead, Plate, SkeletonRows, Status, buttonClass } from "../../components/ui";
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

/** The inside of a stat tile: a label, the count, a note, and an optional link cue. */
function TileBody({
  label,
  icon,
  value,
  note,
  go,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  note: ReactNode;
  /** Text for the link cue, for example "View sales". Set it only on a link tile. */
  go?: string;
}) {
  return (
    <>
      <span className="desk-tile__label">
        {icon}
        {label}
      </span>
      <span className="desk-tile__value">{value}</span>
      <span className="desk-tile__note">{note}</span>
      {go ? (
        <span className="desk-tile__go">
          {go}
          <ArrowRight strokeWidth={2} aria-hidden="true" focusable="false" />
        </span>
      ) : null}
    </>
  );
}

function FrontDesk() {
  const { overview, members, checkIns } = Route.useLoaderData();
  const organization = useOrganization();
  const locationName = useLocationName();
  const showLocation = organization.locations.length > 1;

  return (
    <div className="page desk-page">
      <PageHead title="Front desk" description="Check members in. Then follow up on sales that need payment or delivery." />

      <div className="grid-2 grid-2--wide-first">
        <div className="stack">
          <Plate title="Check in">
            {members.ok ? (
              members.data.length ? (
                <CheckInPanel members={members.data} />
              ) : (
                <Empty title="No members yet">
                  <p>Add a member before the first check-in.</p>
                  <Link to="/$org/members" params={{ org: organization.slug }} className={buttonClass({ variant: "secondary" })}>
                    Add a member
                  </Link>
                </Empty>
              )
            ) : (
              <FailureNotice error={members.error} title="Members did not load" />
            )}
          </Plate>

          {overview.ok ? (
            <Tiles counts={overview.data} slug={organization.slug} />
          ) : (
            <FailureNotice error={overview.error} title="Counts did not load" />
          )}
        </div>

        <Plate
          title="Recent check-ins"
          flush
          description={
            overview.ok
              ? `Today: ${overview.data.check_ins_today.granted} granted, ${overview.data.check_ins_today.denied} denied`
              : undefined
          }
        >
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
                        {showLocation && checkIn.result === "denied" ? " · " : null}
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
              <Empty title="No check-ins yet">
                <p>Each check-in appears here with its result and time.</p>
              </Empty>
            )
          ) : (
            <FailureNotice error={checkIns.error} title="Check-ins did not load" />
          )}
        </Plate>
      </div>
    </div>
  );
}

/** The five counts from the overview. The sales and member tiles link to their lists. */
function Tiles({ counts, slug }: { counts: Schemas["StaffOverview"]; slug: string }) {
  const today = counts.check_ins_today;
  const due = counts.unpaid_sale_count;
  const waiting = counts.awaiting_fulfillment_count;
  const icon = { strokeWidth: 2, "aria-hidden": true, focusable: false } as const;
  return (
    <div className="desk-tiles">
      <div className="desk-tile">
        <TileBody
          label="Check-ins today"
          icon={<CircleCheck {...icon} />}
          value={today.granted + today.denied}
          note={
            <>
              <b>{today.granted}</b> granted, <b>{today.denied}</b> denied
            </>
          }
        />
      </div>
      <Link to="/$org/members" params={{ org: slug }} className="desk-tile">
        <TileBody
          label="Members"
          icon={<Users {...icon} />}
          value={counts.member_count}
          note={
            <>
              <b>{counts.active_membership_count}</b> with access now
            </>
          }
          go="View members"
        />
      </Link>
      <Link
        to="/$org/sales"
        params={{ org: slug }}
        search={{ view: "due" }}
        className="desk-tile"
        data-tone={due ? "warning" : undefined}
      >
        <TileBody
          label="Balance due"
          icon={<CircleAlert {...icon} />}
          value={due}
          note="Sales with a balance due"
          go="View sales"
        />
      </Link>
      <Link
        to="/$org/sales"
        params={{ org: slug }}
        search={{ view: "deliver" }}
        className="desk-tile"
        data-tone={waiting ? "info" : undefined}
      >
        <TileBody
          label="Awaiting delivery"
          icon={<Clock {...icon} />}
          value={waiting}
          note="Paid sales not yet delivered"
          go="View sales"
        />
      </Link>
    </div>
  );
}
