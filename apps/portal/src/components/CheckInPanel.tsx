import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { DENIAL, formatTime } from "../lib/format";
import { useAction, useIdempotencyKey } from "../lib/hooks";
import { createIdempotencyKey } from "../lib/idempotency";
import { useCan, useDeskLocation, useLocationName, useOrganization } from "../lib/organization";
import { createCheckIn } from "../lib/staff.functions";
import { Combobox } from "./Combobox";
import { Field, FailureNotice, Lamp, SubmitButton, describedBy } from "./ui";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

type Input = Parameters<typeof createCheckIn>[0]["data"];
const sendCheckIn = (input: Input) => createCheckIn({ data: input });

const MEMBER_FIELD = "check-in-member";

/**
 * Checks a member in at a location and shows the answer. Rails decides the
 * result; this panel only shows it, with the reason and the next step for a
 * denial. After each result, focus goes back to the member field.
 */
export function CheckInPanel({
  members,
  fixedMember,
}: {
  /** Members to choose from. Leave out when `fixedMember` is set. */
  members?: Schemas["Member"][];
  /** Check in this member only, for example on the member page. */
  fixedMember?: Schemas["MemberSummary"];
}) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const router = useRouter();
  const [key, renewKey] = useIdempotencyKey();
  const action = useAction(sendCheckIn);
  const formRef = useRef<HTMLFormElement>(null);

  const [memberId, setMemberId] = useState<string | null>(fixedMember?.id ?? null);
  // Start at the desk location, and follow it when the top bar changes it.
  const deskLocationId = useDeskLocation()?.id ?? "";
  const [locationId, setLocationId] = useState(deskLocationId);
  useEffect(() => setLocationId(deskLocationId), [deskLocationId]);
  const [memberError, setMemberError] = useState<string | undefined>();
  const [fresh, setFresh] = useState(false);
  const can = useCan();
  const [overriding, setOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState<string | undefined>();

  function focusMember() {
    formRef.current?.querySelector<HTMLElement>(`#${MEMBER_FIELD}`)?.focus();
  }

  /** Lets the member in after a denial. A new request with its own key and the reason. */
  async function letIn() {
    const denied = action.data;
    if (!denied || denied.result !== "denied") return;
    if (!overrideReason.trim()) {
      setOverrideError("Enter why the member may go in. It stays on the record.");
      return;
    }
    setOverrideError(undefined);
    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: createIdempotencyKey(),
      member_id: denied.member.id,
      location_id: denied.location_id,
      override_reason: overrideReason.trim(),
    });
    if (result.ok) {
      setOverriding(false);
      setOverrideReason("");
      setFresh(true);
      void router.invalidate();
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOverriding(false);
    if (!memberId) {
      setMemberError("Choose the member who is checking in.");
      focusMember();
      return;
    }
    setMemberError(undefined);
    setFresh(false);
    const result = await action.run({
      slug: organization.slug,
      idempotencyKey: key,
      member_id: memberId,
      location_id: locationId,
    });
    if (result.ok) {
      renewKey();
      setFresh(true);
      void router.invalidate();
      // Ready for the next person. The result stays on screen until the next pick.
      if (!fixedMember) {
        setMemberId(null);
        focusMember();
      }
    }
  }

  function onChange() {
    // A changed form is a new request; it must not reuse the last key.
    if (action.data || action.error) {
      renewKey();
      action.reset();
    }
  }

  const checkIn = action.data;
  const state = checkIn ? checkIn.result : "off";
  const noLocations = organization.locations.length === 0;
  const manyLocations = organization.locations.length > 1;
  const denial = checkIn?.result === "denied" && checkIn.denial_reason ? DENIAL[checkIn.denial_reason] : null;

  return (
    <form className="form checkin" ref={formRef} onSubmit={onSubmit} noValidate aria-label="Check in">
      {fixedMember ? null : (
        <Combobox
          id={MEMBER_FIELD}
          label="Member"
          options={(members ?? []).map((member) => ({ value: member.id, label: member.name, detail: member.email }))}
          value={memberId}
          onChange={(value) => {
            setMemberId(value);
            setMemberError(undefined);
            onChange();
          }}
          placeholder="Type a name or email"
          hint="Press Enter to choose a member, then Enter again to check in."
          emptyText="No member matches. Check the spelling, or add the member on the Members page."
          error={memberError}
        />
      )}

      <div className="checkin__submit">
        {manyLocations ? (
          <Field id="check-in-location" label="Location">
            <NativeSelect
              id="check-in-location"
              value={locationId}
              onChange={(event) => {
                setLocationId(event.target.value);
                onChange();
              }}
            >
              {organization.locations.map((location) => (
                <NativeSelectOption key={location.id} value={location.id}>
                  {location.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <SubmitButton pending={action.pending} pendingLabel="Checking…" disabled={noLocations} large>
          Check in{fixedMember ? ` ${fixedMember.name.split(" ")[0]}` : ""}
        </SubmitButton>
        {!manyLocations && !noLocations ? <p className="checkin__where">at {locationName(locationId)}</p> : null}
      </div>

      {action.error ? <FailureNotice error={action.error} title="Check-in was not recorded" /> : null}

      <div role="status" aria-live="polite" aria-atomic="true">
        <div className="result" data-state={state} data-fresh={fresh}>
          <Lamp state={state} />
          {checkIn ? (
            checkIn.result === "granted" ? (
              <>
                <p className="result__title">{checkIn.override_reason ? "Let in by staff" : "Access granted"}</p>
                <p className="result__detail">
                  {checkIn.member.name} may go in.
                  {checkIn.override_reason
                    ? ` Their rights said: ${checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title.toLowerCase() : "denied"}. Reason: ${checkIn.override_reason}. Nothing was used.`
                    : ""}
                </p>
                <dl className="facts result__facts">
                  <div>
                    <dt>Member</dt>
                    <dd>{checkIn.member.name}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{locationName(checkIn.location_id)}</dd>
                  </div>
                  <div>
                    <dt>Time</dt>
                    <dd>
                      <time dateTime={checkIn.checked_in_at}>{formatTime(checkIn.checked_in_at, organization.timezone)}</time>
                    </dd>
                  </div>
                  {checkIn.entitlement_id ? (
                    <div>
                      <dt>Right used</dt>
                      <dd>
                        <code>{checkIn.entitlement_id.slice(0, 8)}</code>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </>
            ) : (
              <>
                <p className="result__title">Denied: {denial ? denial.title : "No reason given"}</p>
                <p className="result__detail">
                  {checkIn.member.name} at {locationName(checkIn.location_id)}. {denial?.next} Nothing was used.
                </p>
              </>
            )
          ) : (
            <>
              <p className="result__title">Ready</p>
              <p className="result__detail">
                {noLocations
                  ? "This organization has no locations, so check-in is not possible."
                  : "The result shows here. A denial always names its reason."}
              </p>
            </>
          )}
        </div>
      </div>

      {checkIn?.result === "denied" && can("check_ins:override") ? (
        overriding ? (
          <div className="checkin__override">
            <Field id="override-reason" label="Why may they go in?" error={overrideError}>
              <Textarea
                id="override-reason"
                rows={2}
                maxLength={500}
                value={overrideReason}
                aria-invalid={overrideError ? true : undefined}
                aria-describedby={describedBy("override-reason", undefined, overrideError)}
                onChange={(event) => setOverrideReason(event.target.value)}
              />
            </Field>
            <div className="actions">
              <Button type="button" variant="ghost" onClick={() => setOverriding(false)} disabled={action.pending}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={() => void letIn()} disabled={action.pending} aria-busy={action.pending || undefined}>
                Let in anyway
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setOverriding(true)}>
            Let in anyway
          </Button>
        )
      ) : null}

      {checkIn ? <NextSteps checkIn={checkIn} slug={organization.slug} /> : null}
    </form>
  );
}

/** Links for what staff can do after a result. A denial gets the fix first. */
function NextSteps({ checkIn, slug }: { checkIn: Schemas["CheckIn"]; slug: string }) {
  const member = (
    <Link
      to="/$org/members/$memberId"
      params={{ org: slug, memberId: checkIn.member.id }}
      className={buttonVariants({ variant: "ghost" })}
    >
      Open {checkIn.member.name}
    </Link>
  );

  if (checkIn.result === "granted") return <div className="actions checkin__next">{member}</div>;

  return (
    <div className="actions checkin__next">
      {checkIn.denial_reason === "no_entitlement" ? (
        <>
          <Link
            to="/$org/sales/new"
            params={{ org: slug }}
            search={{ member: checkIn.member.id }}
            className={buttonVariants({ variant: "secondary" })}
          >
            Sell a membership
          </Link>
          <Link
            to="/$org/sales"
            params={{ org: slug }}
            search={{ view: "due" }}
            className={buttonVariants({ variant: "secondary" })}
          >
            Record a payment
          </Link>
          <Link
            to="/$org/sales"
            params={{ org: slug }}
            search={{ view: "deliver" }}
            className={buttonVariants({ variant: "secondary" })}
          >
            Deliver a paid sale
          </Link>
        </>
      ) : checkIn.denial_reason === "usage_limit_reached" ? (
        <Link
          to="/$org/sales/new"
          params={{ org: slug }}
          search={{ member: checkIn.member.id }}
          className={buttonVariants({ variant: "secondary" })}
        >
          Sell a renewal
        </Link>
      ) : null}
      {member}
    </div>
  );
}
