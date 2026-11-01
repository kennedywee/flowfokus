import { useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import type { Schemas } from "@flowfokus/api";
import { UserPlus } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";
import { Avatar, FailureNotice, Field, Pill, Plate, SubmitButton, describedBy } from "../../components/ui";
import { failureMessage, formatDate } from "../../lib/format";
import { useAction } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import { changeStaffRole, inviteStaff, removeStaff, revokeInvitation } from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle, useRestoreFocus } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sendInvite = (input: Parameters<typeof inviteStaff>[0]["data"]) => inviteStaff({ data: input });
const sendRevoke = (input: Parameters<typeof revokeInvitation>[0]["data"]) => revokeInvitation({ data: input });
const sendRole = (input: Parameters<typeof changeStaffRole>[0]["data"]) => changeStaffRole({ data: input });
const sendRemove = (input: Parameters<typeof removeStaff>[0]["data"]) => removeStaff({ data: input });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Staff of this organization. WorkOS holds staff access: every change here
 * calls WorkOS through Rails, which refuses escalation and keeps a manager.
 */
export function TeamSettings({ team }: { team: Result<Schemas["Team"]> | null }) {
  const [inviting, setInviting] = useState(false);
  if (!team) return null;
  if (!team.ok) {
    return (
      <Plate title="Your team">
        <FailureNotice
          error={team.error}
          title={team.error.code === "forbidden" ? "Only staff with staff:manage can see the team" : "The team did not load"}
        />
      </Plate>
    );
  }
  const { members, invitations, roles } = team.data;
  const grantable = roles.filter((role) => role.grantable);

  return (
    <>
      <Plate
        title="Your team"
        description="People with staff access here. Role changes reach a person's session at their next refresh."
        flush
        action={
          <Button type="button" variant="secondary" size="sm" disabled={!grantable.length} onClick={() => setInviting(true)}>
            <UserPlus aria-hidden="true" />
            Invite staff
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Staff member</TableHead>
              <TableHead scope="col">Role</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">
                <span className="visually-hidden">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <MemberRow key={member.id} member={member} roles={grantable} />
            ))}
          </TableBody>
        </Table>
      </Plate>
      {invitations.length ? (
        <Plate title="Pending invitations" description="WorkOS emails each invitation. It expires unless accepted." flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Email</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">Expires</TableHead>
                <TableHead scope="col">
                  <span className="visually-hidden">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <InvitationRow key={invitation.id} invitation={invitation} roles={roles} />
              ))}
            </TableBody>
          </Table>
        </Plate>
      ) : null}
      {inviting ? <InviteDialog roles={grantable} onClose={() => setInviting(false)} /> : null}
    </>
  );
}

function MemberRow({ member, roles }: { member: Schemas["TeamMember"]; roles: Schemas["TeamRole"][] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const changing = useAction(sendRole);
  const removing = useAction(sendRemove);
  const [confirming, setConfirming] = useState(false);
  const choices = roles.some((role) => role.slug === member.role) ? roles : [];

  async function changeRole(role: string) {
    const result = await changing.run({ slug: organization.slug, id: member.id, role });
    if (result.ok) {
      toast.show({ tone: "success", title: "Role changed", body: `${member.name} gets the new role at their next session refresh.` });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The role did not change", body: failureMessage(result.error) });
    }
  }

  async function remove() {
    const result = await removing.run({ slug: organization.slug, id: member.id });
    setConfirming(false);
    if (result.ok) {
      toast.show({ tone: "success", title: "Access removed", body: `${member.name} can no longer open this organization.` });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "Access was not removed", body: failureMessage(result.error) });
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="preview-person">
          <Avatar name={member.name} />
          <div>
            <strong>
              {member.name}
              {member.you ? " (you)" : ""}
            </strong>
            <p>{member.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {member.manageable && choices.length ? (
          <NativeSelect
            className="input--small"
            aria-label={`Role for ${member.name}`}
            value={member.role}
            disabled={changing.pending}
            onChange={(event) => void changeRole(event.target.value)}
          >
            {choices.map((role) => (
              <NativeSelectOption key={role.slug} value={role.slug}>
                {role.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : (
          member.role_name
        )}
      </TableCell>
      <TableCell>
        <Pill tone={member.status === "active" ? "good" : "warning"}>{member.status === "active" ? "Active" : member.status === "pending" ? "Pending" : "Inactive"}</Pill>
      </TableCell>
      <TableCell className="num">
        {member.manageable ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Remove<span className="visually-hidden"> {member.name}</span>
          </Button>
        ) : null}
        <ConfirmDialog
          open={confirming}
          tone="critical"
          title={`Remove ${member.name}'s staff access?`}
          confirmLabel="Remove access"
          pendingLabel="Removing…"
          pending={removing.pending}
          onConfirm={() => void remove()}
          onCancel={() => setConfirming(false)}
        >
          <p>They lose this organization at their next session refresh. Their past sales and check-ins stay.</p>
        </ConfirmDialog>
      </TableCell>
    </TableRow>
  );
}

function InvitationRow({ invitation, roles }: { invitation: Schemas["TeamInvitation"]; roles: Schemas["TeamRole"][] }) {
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendRevoke);
  const role = roles.find((item) => item.slug === invitation.role);

  async function revoke() {
    const result = await action.run({ slug: organization.slug, invitationId: invitation.id });
    if (result.ok) {
      toast.show({ tone: "success", title: "Invitation revoked", body: invitation.email });
      void router.invalidate();
    } else {
      toast.show({ tone: "error", title: "The invitation was not revoked", body: failureMessage(result.error) });
    }
  }

  return (
    <TableRow>
      <TableCell className="cell-title">{invitation.email}</TableCell>
      <TableCell>{role?.name ?? invitation.role ?? "Default"}</TableCell>
      <TableCell className="muted">{invitation.expires_at ? formatDate(invitation.expires_at, organization.timezone) : "No expiry"}</TableCell>
      <TableCell className="num">
        {role?.grantable ?? true ? (
          <Button type="button" variant="ghost" size="sm" disabled={action.pending} onClick={() => void revoke()}>
            Revoke<span className="visually-hidden"> invitation for {invitation.email}</span>
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function InviteDialog({ roles, onClose }: { roles: Schemas["TeamRole"][]; onClose: () => void }) {
  useRestoreFocus();
  const organization = useOrganization();
  const router = useRouter();
  const toast = useToast();
  const action = useAction(sendInvite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles.find((item) => item.slug === "receptionist")?.slug ?? roles[0]?.slug ?? "");
  const [emailError, setEmailError] = useState<string | undefined>();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setEmailError("Enter an email address, for example name@example.com.");
      return;
    }
    setEmailError(undefined);
    const result = await action.run({ slug: organization.slug, email: email.trim(), role });
    if (result.ok) {
      toast.show({ tone: "success", title: "Invitation sent", body: `WorkOS emails ${email.trim()} a link to join.` });
      void router.invalidate();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(value) => !value && !action.pending && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogBody>
            <DialogTitle>Invite staff</DialogTitle>
            <DialogDescription>You can grant only roles whose permissions you hold.</DialogDescription>
            {action.error ? <FailureNotice error={action.error} title="The invitation was not sent" /> : null}
            <div className="form">
              <Field id="invite-email" label="Email" error={emailError}>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  autoFocus
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={describedBy("invite-email", undefined, emailError)}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              <Field id="invite-role" label="Role">
                <NativeSelect id="invite-role" value={role} onChange={(event) => setRole(event.target.value)}>
                  {roles.map((item) => (
                    <NativeSelectOption key={item.slug} value={item.slug}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={action.pending}>
              Cancel
            </Button>
            <SubmitButton pending={action.pending} pendingLabel="Sending…">
              Send invitation
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
