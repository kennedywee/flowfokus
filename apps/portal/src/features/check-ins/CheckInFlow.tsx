import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { useToast } from "../../components/Toast";
import { SubmitButton, describedBy } from "../../components/ui";
import { failureMessage } from "../../lib/format";
import { useCan, useDeskLocation, useLocationName, useOrganization } from "../../lib/organization";
import type { Failure } from "../../lib/result";
import { createCheckIn, getMemberRecord, type MemberRecord } from "../../lib/staff.functions";
import { balanceDue } from "../members/facts";
import { RenewDialog } from "../members/MemberDetails";
import { createCheckInSender, type CheckInAttempt } from "./attempt";
import { denialAccess, firstName } from "./facts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type Member = Pick<Schemas["MemberSummary"], "id" | "name">;

/**
 * Checks members in at the top bar location. Rails decides the result:
 *
 *   const flow = useCheckIn();
 *   flow.checkIn(member);   // a toast for a check-in, the denial dialog for a denial
 *   return <>{…}{flow.dialog}</>;
 *
 * Each attempt has one idempotency key. A double click sends nothing extra,
 * and Try again resends the same key, so Rails records one check-in.
 * `record` gives the denial dialog the member's balance and renewal when the
 * page already has them; otherwise the dialog loads them.
 */
export function useCheckIn({ record }: { record?: MemberRecord } = {}) {
  const organization = useOrganization();
  const location = useDeskLocation();
  const router = useRouter();
  const toast = useToast();
  const slug = organization.slug;
  const sender = useMemo(
    () =>
      createCheckInSender((attempt: CheckInAttempt) =>
        createCheckIn({
          data: {
            slug,
            idempotencyKey: attempt.idempotencyKey,
            member_id: attempt.memberId,
            location_id: attempt.locationId,
            ...(attempt.overrideReason ? { override_reason: attempt.overrideReason } : {}),
          },
        }),
      ),
    [slug],
  );
  const [pending, setPending] = useState(false);
  const [denied, setDenied] = useState<Schemas["CheckIn"] | null>(null);

  function granted(checkIn: Schemas["CheckIn"]) {
    toast.show({
      tone: "success",
      title: checkIn.override_reason ? `${checkIn.member.name} let in by staff` : `${checkIn.member.name} checked in`,
    });
    void router.invalidate();
  }

  async function checkIn(member: Member) {
    if (!location) {
      toast.show({ tone: "error", title: `${organization.name} has no location`, body: "Add a location to check members in." });
      return;
    }
    setPending(true);
    const result = await sender.send({ memberId: member.id, locationId: location.id });
    setPending(false);
    if (!result.ok) {
      toast.show({
        tone: "error",
        title: `${member.name} was not checked in. ${retryHint(result.error)}`,
        action: { label: "Try again", onClick: () => void checkIn(member) },
      });
      return;
    }
    if (result.data.result === "granted") granted(result.data);
    else {
      setDenied(result.data);
      // The denied attempt is on the list too.
      void router.invalidate();
    }
  }

  /** Lets the denied member in. Its own attempt, with the reason; errors stay in the dialog. */
  async function letIn(denial: Schemas["CheckIn"], reason: string) {
    setPending(true);
    const result = await sender.send({ memberId: denial.member.id, locationId: denial.location_id, overrideReason: reason });
    setPending(false);
    if (result.ok) {
      setDenied(null);
      if (result.data.result === "granted") granted(result.data);
      else setDenied(result.data);
    }
    return result;
  }

  const dialog = denied ? (
    <DenialDialog
      key={denied.id}
      checkIn={denied}
      record={record?.member.id === denied.member.id ? record : undefined}
      pending={pending}
      onLetIn={(reason) => letIn(denied, reason)}
      onClose={() => setDenied(null)}
    />
  ) : null;

  return { checkIn, pending, dialog, hasLocation: location !== null };
}

/** The next step after a failed request, in staff words. */
function retryHint(error: Failure): string {
  return error.code === "forbidden" ? "Your role can't check members in." : "Try again.";
}

/**
 * Paper "Denied": the member, the facts behind the denial, and the next step.
 * Staff with check_ins:override can let the member in with a reason. The
 * reason is saved on the check-in and nothing is used.
 */
function DenialDialog({
  checkIn,
  record: given,
  pending,
  onLetIn,
  onClose,
}: {
  checkIn: Schemas["CheckIn"];
  record?: MemberRecord;
  pending: boolean;
  onLetIn: (reason: string) => Promise<{ ok: true } | { ok: false; error: Failure }>;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const locationName = useLocationName();
  const can = useCan();
  const member = checkIn.member;
  const first = firstName(member.name);
  const [overriding, setOverriding] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [failure, setFailure] = useState<Failure | null>(null);
  const [renewing, setRenewing] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const record = useMemberRecord(member.id, given);

  const canOverride = can("check_ins:override");
  const canSell = can("purchases:create");
  const due = record ? balanceDue(record.sales) : null;
  const renewal = record?.member.renewal ?? null;

  useEffect(() => {
    if (overriding) reasonRef.current?.focus();
  }, [overriding]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!reason.trim()) {
      setReasonError("Enter a reason. It stays on the record.");
      reasonRef.current?.focus();
      return;
    }
    setReasonError(undefined);
    const result = await onLetIn(reason.trim());
    setFailure(result.ok ? null : result.error);
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  const close = () => {
    if (!pending) onClose();
  };

  return (
    <>
      <Dialog open={!renewing} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sale-dialog denial-dialog" initialFocus={closeRef}>
          <form noValidate onSubmit={submit} onKeyDown={onKeyDown}>
            <div className="denial-dialog__body">
              <div className="denial-dialog__head">
                <DeniedMark />
                <DialogTitle className="denial-dialog__title">{member.name} can't check in</DialogTitle>
              </div>
              <dl className="denial-dialog__facts">
                <div>
                  <dt>Access</dt>
                  <dd>{denialAccess(checkIn.denial_reason, locationName(checkIn.location_id))}</dd>
                </div>
                {due ? (
                  <div>
                    <dt>Balance</dt>
                    <dd className="money">{due.length ? `${due.join(" + ")} due` : "No balance due"}</dd>
                  </div>
                ) : null}
              </dl>
              {overriding ? (
                <div className="denial-dialog__reason">
                  <label htmlFor="override-reason">Why let {first} in?</label>
                  <Textarea
                    ref={reasonRef}
                    id="override-reason"
                    className="sale-input"
                    rows={2}
                    maxLength={500}
                    value={reason}
                    aria-invalid={reasonError ? true : undefined}
                    aria-describedby={describedBy("override-reason", "override-reason-hint", reasonError)}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  {reasonError ? (
                    <FieldError id="override-reason-error">{reasonError}</FieldError>
                  ) : (
                    <p id="override-reason-hint" className="denial-dialog__hint">
                      Saved on {first}'s check-in. Nothing is used.
                    </p>
                  )}
                  {failure ? (
                    <div className="sale-dialog__failure" role="alert">
                      <p className="sale-dialog__failure-title">{first} was not let in</p>
                      <p>{failureMessage(failure)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="sale-dialog__foot denial-dialog__foot">
              {overriding ? (
                <>
                  <Button type="button" variant="secondary" size="compact" disabled={pending} onClick={() => setOverriding(false)}>
                    Cancel
                  </Button>
                  <SubmitButton compact pending={pending} pendingLabel="Letting in…" aria-keyshortcuts="Meta+Enter Control+Enter">
                    Let in {first}
                  </SubmitButton>
                </>
              ) : (
                <>
                  {canOverride ? (
                    <Button type="button" variant="ghost" size="compact" className="denial-dialog__override" onClick={() => setOverriding(true)}>
                      Let in anyway…
                    </Button>
                  ) : null}
                  <Button ref={closeRef} type="button" variant="secondary" size="compact" onClick={close}>
                    Close
                  </Button>
                  {checkIn.denial_reason === "no_entitlement" && canSell ? (
                    <Link
                      to="/$org/sales/new"
                      params={{ org: organization.slug }}
                      search={{ member: member.id }}
                      className={buttonVariants({ size: "compact" })}
                    >
                      New sale
                    </Link>
                  ) : checkIn.denial_reason === "usage_limit_reached" && canSell && renewal ? (
                    <Button type="button" size="compact" onClick={() => setRenewing(true)}>
                      Renew
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {renewal && record ? (
        <RenewDialog member={record.member} renewal={renewal} open={renewing} onClose={onClose} />
      ) : null}
    </>
  );
}

/**
 * The member's sales and renewal terms, for the Balance row and Renew. Uses
 * the page's record when it has one. Roles that cannot read sales see the
 * dialog without them.
 */
function useMemberRecord(memberId: string, given?: MemberRecord): MemberRecord | null {
  const organization = useOrganization();
  const can = useCan();
  const allowed = can("members:read") && can("purchases:read") && can("check_ins:read");
  const [loaded, setLoaded] = useState<MemberRecord | null>(null);
  useEffect(() => {
    if (given || !allowed) return;
    let current = true;
    getMemberRecord({ data: { slug: organization.slug, id: memberId } })
      .then((result) => {
        if (current && result.ok) setLoaded(result.data);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [given, allowed, organization.slug, memberId]);
  return given ?? loaded;
}

/** A filled red circle with a cross, as in Paper. */
function DeniedMark({ size = 20 }: { size?: number }) {
  return (
    <svg className="denied-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

/** A filled green circle with a tick, as in Paper. */
export function GrantedMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="granted-mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
