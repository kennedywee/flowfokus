import { useState } from "react";
import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { RefreshCw, ShoppingBag } from "lucide-react";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { useToast } from "../../../components/Toast";
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
  type LampState,
} from "../../../components/ui";
import { DENIAL, failureMessage, formatDate, formatDuration, formatMoney, formatUsage, formatWhen } from "../../../lib/format";
import { useAction, useIdempotencyKey } from "../../../lib/hooks";
import { useCan, useDeskLocation, useLocationName, useOrganization } from "../../../lib/organization";
import { createLinkCode, getMemberRecord, renewMembership, unlinkMember } from "../../../lib/staff.functions";
import { isUuid } from "../../../lib/validate";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sendLinkCode = (input: Parameters<typeof createLinkCode>[0]["data"]) => createLinkCode({ data: input });
const sendUnlink = (input: Parameters<typeof unlinkMember>[0]["data"]) => unlinkMember({ data: input });
const sendRenewal = (input: Parameters<typeof renewMembership>[0]["data"]) => renewMembership({ data: input });

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
  const can = useCan();

  if (!record.ok) {
    return (
      <div className="page member-page">
        <FailureNotice error={record.error} title="This member did not load" />
      </div>
    );
  }

  const { member, sales, checkIns } = record.data;
  return (
    <div className="page member-page">
      <PageHead title={member.name}>
        {member.renewal && can("purchases:create") ? <RenewButton member={member} renewal={member.renewal} /> : null}
        <Link
          to="/$org/sales/new"
          params={{ org: organization.slug }}
          search={{ member: member.id }}
          className={buttonVariants()}
        >
          <ShoppingBag aria-hidden="true" />
          Sell a membership
        </Link>
      </PageHead>

      <Details member={member} />

      <div className="grid-2">
        <Access member={member} />
        <Plate title="Check in">
          <CheckInPanel fixedMember={member} />
        </Plate>
      </div>

      <Plate
        title="Sales"
        description="Newest first. Open a sale to record payment or deliver it."
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
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Sell a membership
              </Link>
            </Empty>
          </div>
        )}
      </Plate>

      <Periods member={member} />

      <Plate title="Check-in history" flush>
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

/**
 * Sells another period at the member's agreed price. Rails copies the terms of
 * the latest delivered sale, never the current catalog price.
 */
function RenewButton({ member, renewal }: { member: Schemas["MemberDetail"]; renewal: Schemas["RenewalTerms"] }) {
  const organization = useOrganization();
  const location = useDeskLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const action = useAction(sendRenewal);
  const [key, renewKey] = useIdempotencyKey();
  const [confirming, setConfirming] = useState(false);
  const price = formatMoney(renewal.amount_minor, renewal.currency);

  async function renew() {
    if (!location) return;
    const result = await action.run({ slug: organization.slug, idempotencyKey: key, memberId: member.id, location_id: location.id });
    if (result.ok) {
      renewKey();
      setConfirming(false);
      toast.show({ tone: "success", title: "Renewal recorded", body: "Record payment, then deliver the new period." });
      void navigate({ to: "/$org/sales/$saleId", params: { org: organization.slug, saleId: result.data.id } });
    }
  }

  return (
    <>
      <Button type="button" variant="secondary" disabled={!location} onClick={() => setConfirming(true)}>
        <RefreshCw aria-hidden="true" />
        Renew
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Renew ${member.name} for ${price}?`}
        confirmLabel={`Renew for ${price}`}
        pendingLabel="Recording…"
        pending={action.pending}
        onConfirm={() => void renew()}
        onCancel={() => {
          action.reset();
          setConfirming(false);
        }}
      >
        <p>
          {renewal.product_name}, {renewal.price_label}: {formatDuration(renewal.duration_days)} at the agreed price. If
          delivered now, the new period starts {formatDate(renewal.starts_at, organization.timezone)}.
        </p>
        <p>Sold at {location?.name ?? "no location"}.</p>
        {action.error ? <p role="alert">{failureMessage(action.error)}</p> : null}
      </ConfirmDialog>
    </>
  );
}

function Details({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  return (
    <Plate title="Details">
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
          <dt>Gym site account</dt>
          <dd>
            <AccountLink member={member} />
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

/**
 * The member's link to a gym site sign-in. Staff give a one-time code; the
 * member enters it after signing in. Rails shows the code once.
 */
function AccountLink({ member }: { member: Schemas["MemberDetail"] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const can = useCan();
  const issue = useAction(sendLinkCode);
  const unlink = useAction(sendUnlink);
  const [code, setCode] = useState<Schemas["MemberLinkCode"] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const allowed = can("members:link");

  if (member.linked_email) {
    return (
      <span className="member-link">
        Linked to {member.linked_email}
        {allowed ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Unlink
            </Button>
            <ConfirmDialog
              open={confirming}
              tone="critical"
              title={`Unlink ${member.name}'s sign-in?`}
              confirmLabel="Unlink"
              pendingLabel="Unlinking…"
              pending={unlink.pending}
              onConfirm={async () => {
                const result = await unlink.run({ slug: organization.slug, id: member.id });
                setConfirming(false);
                if (result.ok) {
                  toast.show({ tone: "success", title: "Sign-in unlinked", body: "The member record and its history stay." });
                  void router.invalidate();
                } else {
                  toast.show({ tone: "error", title: "The sign-in was not unlinked", body: failureMessage(result.error) });
                }
              }}
              onCancel={() => setConfirming(false)}
            >
              <p>They can no longer see this membership on the gym site until they link again with a new code.</p>
            </ConfirmDialog>
          </>
        ) : null}
      </span>
    );
  }

  if (code) {
    return (
      <span className="member-link">
        <span>
          Give this code to {member.name}: <strong className="member-link__code">{code.code}</strong>
        </span>
        <span className="muted">
          Works once, until {formatDate(code.expires_at, organization.timezone)}. They sign in on the gym site and enter it.
        </span>
      </span>
    );
  }

  return (
    <span className="member-link">
      <span className="muted">Not linked</span>
      {allowed ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={issue.pending}
          onClick={async () => {
            const result = await issue.run({ slug: organization.slug, id: member.id });
            if (result.ok) setCode(result.data);
            else toast.show({ tone: "error", title: "No code was created", body: failureMessage(result.error) });
          }}
        >
          Create link code
        </Button>
      ) : null}
    </span>
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

const PERIOD_STATE: Record<"current" | "upcoming" | "ended" | "revoked", { lamp: LampState; label: string }> = {
  revoked: { lamp: "denied", label: "Revoked" },
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
      flush
    >
      {periods.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Starts</TableHead>
              <TableHead scope="col" className="col-wide">
                Ends
              </TableHead>
              <TableHead scope="col">State</TableHead>
              <TableHead scope="col">Sale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...periods].reverse().map((period) => {
              const starts = Date.parse(period.starts_at);
              const ends = Date.parse(period.ends_at);
              const state = period.revoked_at ? "revoked" : now >= ends ? "ended" : now >= starts ? "current" : "upcoming";
              return (
                <TableRow key={period.id}>
                  <TableCell className="member-date">
                    <time dateTime={period.starts_at} suppressHydrationWarning>
                      {formatDate(period.starts_at, organization.timezone)}
                    </time>
                    <span className="cell-sub phone-only">
                      to{" "}
                      <time dateTime={period.ends_at} suppressHydrationWarning>
                        {formatDate(period.ends_at, organization.timezone)}
                      </time>
                    </span>
                  </TableCell>
                  <TableCell className="member-date col-wide">
                    <time dateTime={period.ends_at} suppressHydrationWarning>
                      {formatDate(period.ends_at, organization.timezone)}
                    </time>
                  </TableCell>
                  <TableCell>
                    <Status state={PERIOD_STATE[state].lamp}>{PERIOD_STATE[state].label}</Status>
                  </TableCell>
                  <TableCell>
                    <Link to="/$org/sales/$saleId" params={{ org: organization.slug, saleId: period.sale_id }}>
                      View sale
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Result</TableHead>
          <TableHead scope="col">Reason</TableHead>
          <TableHead scope="col" className="col-wide">
            Location
          </TableHead>
          <TableHead scope="col" className="num col-wide">
            When
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checkIns.map((checkIn) => (
          <TableRow key={checkIn.id}>
            <TableCell>
              <Status state={checkIn.result}>{checkIn.override_reason ? "Let in by staff" : checkIn.result === "granted" ? "Granted" : "Denied"}</Status>
            </TableCell>
            <TableCell className="muted">
              {checkIn.override_reason
                ? `${checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "Denied"}. Reason: ${checkIn.override_reason}`
                : checkIn.denial_reason
                  ? DENIAL[checkIn.denial_reason].title
                  : checkIn.result === "granted"
                    ? "Access valid"
                    : "No reason recorded"}
              <span className="cell-sub phone-only">
                {locationName(checkIn.location_id)} ·{" "}
                <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                  {formatWhen(checkIn.checked_in_at, organization.timezone)}
                </time>
              </span>
            </TableCell>
            <TableCell className="col-wide">{locationName(checkIn.location_id)}</TableCell>
            <TableCell className="num member-date col-wide">
              <time dateTime={checkIn.checked_in_at} suppressHydrationWarning>
                {formatWhen(checkIn.checked_in_at, organization.timezone)}
              </time>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
