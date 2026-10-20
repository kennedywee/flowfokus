import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { DENIAL, formatTime } from "../lib/format";
import { useAction, useIdempotencyKey } from "../lib/hooks";
import { useLocationName, useOrganization } from "../lib/organization";
import { createCheckIn } from "../lib/staff.functions";
import { Field, FailureNotice, Lamp, SubmitButton, describedBy } from "./ui";

type Input = Parameters<typeof createCheckIn>[0]["data"];
const sendCheckIn = (input: Input) => createCheckIn({ data: input });

/**
 * Checks a member in at a location and lights the answer. Rails decides the
 * result; this panel only shows it, with the reason for a denial.
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

  const [memberId, setMemberId] = useState(fixedMember?.id ?? "");
  const [locationId, setLocationId] = useState(organization.locations[0]?.id ?? "");
  const [memberError, setMemberError] = useState<string | undefined>();
  const [fresh, setFresh] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberId) {
      setMemberError("Choose the member who is checking in.");
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

  return (
    <form className="form" onSubmit={onSubmit} noValidate aria-label="Check in">
      <div className="form-row">
        {fixedMember ? null : (
          <Field id="check-in-member" label="Member" error={memberError}>
            <select
              id="check-in-member"
              className="select"
              value={memberId}
              onChange={(event) => {
                setMemberId(event.target.value);
                setMemberError(undefined);
                onChange();
              }}
              aria-invalid={memberError ? true : undefined}
              aria-describedby={describedBy("check-in-member", undefined, memberError)}
            >
              <option value="">Choose a member</option>
              {(members ?? []).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.email}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id="check-in-location" label="Location">
          <select
            id="check-in-location"
            className="select"
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              onChange();
            }}
            disabled={noLocations}
          >
            {organization.locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="actions">
        <SubmitButton pending={action.pending} pendingLabel="Checking…" disabled={noLocations} large>
          Check in{fixedMember ? ` ${fixedMember.name.split(" ")[0]}` : ""}
        </SubmitButton>
      </div>

      {action.error ? <FailureNotice error={action.error} title="Check-in was not recorded" /> : null}

      <div className="result" data-state={state} data-fresh={fresh} role="status" aria-live="polite">
        <Lamp state={state} />
        {checkIn ? (
          checkIn.result === "granted" ? (
            <>
              <p className="result__title">Access granted</p>
              <p className="result__detail">
                {checkIn.member.name} at {locationName(checkIn.location_id)},{" "}
                <time dateTime={checkIn.checked_in_at}>{formatTime(checkIn.checked_in_at, organization.timezone)}</time>.
              </p>
            </>
          ) : (
            <>
              <p className="result__title">Denied: {checkIn.denial_reason ? DENIAL[checkIn.denial_reason].title : "No reason given"}</p>
              <p className="result__detail">
                {checkIn.member.name} at {locationName(checkIn.location_id)}.{" "}
                {checkIn.denial_reason ? DENIAL[checkIn.denial_reason].next : null} Nothing was used.
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
    </form>
  );
}
