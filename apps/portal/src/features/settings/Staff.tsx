import { createContext, useContext, useState } from "react";
import type { Schemas } from "@flowfokus/api";
import { Icon } from "@/components/ui/icon";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FormNotice } from "../../components/FormNotice";
import { useToast } from "../../components/Toast";
import { SubmitButton, initials } from "../../components/ui";
import { useAction } from "../../lib/hooks";
import { useOrganization } from "../../lib/organization";
import type { Result } from "../../lib/result";
import {
  changeStaffRole,
  inviteStaff,
  removeStaff,
  revokeInvitation,
} from "../../lib/staff.functions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SaleDialog } from "../sales/SaleDialogs";
import { FieldError } from "./Locations";
import { LockLine, SettingsPage, SettingsPageAction } from "./SettingsPage";
import {
  firstName,
  invitationLine,
  listedMembers,
  inviteFailure,
  memberStatus,
  roleChoices,
  roleName,
  staffChangeFailure,
  staffCount,
  type TeamInvitation,
  type TeamMember,
  type TeamRole,
} from "./team";

const sendInvite = (input: Parameters<typeof inviteStaff>[0]["data"]) =>
  inviteStaff({ data: input });
const sendRevoke = (input: Parameters<typeof revokeInvitation>[0]["data"]) =>
  revokeInvitation({ data: input });
const sendRole = (input: Parameters<typeof changeStaffRole>[0]["data"]) =>
  changeStaffRole({ data: input });
const sendRemove = (input: Parameters<typeof removeStaff>[0]["data"]) =>
  removeStaff({ data: input });

const icon = {
  "aria-hidden": true,
  focusable: false,
} as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reloads the staff list after a change. The Settings dialog owns the list. */
const ReloadTeam = createContext<() => Promise<void>>(async () => {});

/**
 * Staff. WorkOS holds staff access: every change goes through Rails, which
 * refuses escalation and keeps someone who can manage staff. Rows show only
 * what Rails returns: name, email, role, and status. `team` is null while it
 * loads.
 */
export function Staff({ team, reload }: { team: Result<Schemas["Team"]> | null; reload: () => Promise<void> }) {
  const [inviting, setInviting] = useState(false);

  if (!team) {
    return (
      <SettingsPage title="Staff">
        <p className="settings-state" role="status">
          Loading staff…
        </p>
      </SettingsPage>
    );
  }
  if (!team.ok) {
    return (
      <SettingsPage title="Staff">
        {team.error.code === "forbidden" ? (
          <LockLine>Seeing staff needs a role that can manage staff.</LockLine>
        ) : (
          <DidNotLoad what="Staff" reload={reload} />
        )}
      </SettingsPage>
    );
  }

  const { invitations, roles } = team.data;
  const members = listedMembers(team.data);
  const grantable = roles.filter((role) => role.grantable);
  return (
    <ReloadTeam.Provider value={reload}>
      <SettingsPage
        title="Staff"
        action={grantable.length ? <SettingsPageAction onClick={() => setInviting(true)}>Invite staff</SettingsPageAction> : null}
      >
        <section className="settings-table" aria-label="Staff">
          <div className="settings-table__head settings-staff__grid" aria-hidden="true">
            <span>Name</span>
            <span className="settings-col--wide">Role</span>
            <span className="settings-col--wide">Status</span>
            <span />
          </div>
          <ul className="settings-rows">
            {members.map((member) => (
              <MemberRow key={member.id} member={member} roles={roles} />
            ))}
            {invitations.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} roles={roles} />
            ))}
          </ul>
          <p className="settings-foot">{staffCount(team.data)}</p>
        </section>
        {inviting ? <InviteDialog roles={grantable} onClose={() => setInviting(false)} /> : null}
      </SettingsPage>
    </ReloadTeam.Provider>
  );
}

/** The list did not load: say so, with Reload. Roles uses it too. */
export function DidNotLoad({ what, reload }: { what: string; reload: () => Promise<void> }) {
  const [retrying, setRetrying] = useState(false);
  return (
    <div className="settings-state" role="alert">
      <p>{what} did not load.</p>
      <Button
        type="button"
        variant="secondary"
        size="compact"
        disabled={retrying}
        aria-busy={retrying || undefined}
        onClick={async () => {
          setRetrying(true);
          await reload();
          setRetrying(false);
        }}
      >
        Reload
      </Button>
    </div>
  );
}

/** Paper's status style for a member who is not active: a coloured icon with grey text. */
function StatusMark({ member }: { member: TeamMember }) {
  const status = memberStatus(member.status);
  if (!status) return <span className="settings-status">Active</span>;
  const iconName = status.tone === "warning" ? "length" : "close";
  return (
    <span className="settings-status" data-tone={status.tone}>
      <Icon name={iconName} {...icon} />
      {status.label}
    </span>
  );
}

function MemberRow({
  member,
  roles,
}: {
  member: TeamMember;
  roles: TeamRole[];
}) {
  const organization = useOrganization();
  const reload = useContext(ReloadTeam);
  const toast = useToast();
  const changing = useAction(sendRole);
  const removing = useAction(sendRemove);
  const [confirming, setConfirming] = useState(false);
  const choices = roleChoices(member, roles);
  const roleLabel = member.role_name;

  async function changeRole(role: string) {
    if (role === member.role || changing.pending) return;
    const result = await changing.run({
      slug: organization.slug,
      id: member.id,
      role,
    });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: `${member.name} is now ${roleName(roles, role)}. This can take a few minutes.`,
      });
      void reload();
      return;
    }
    const failure = staffChangeFailure(result.error, member.name);
    toast.show({ tone: "error", title: `Role not changed. ${failure.text}` });
    if (failure.reload) void reload();
  }

  async function remove() {
    const result = await removing.run({
      slug: organization.slug,
      id: member.id,
    });
    setConfirming(false);
    if (result.ok) {
      toast.show({ tone: "success", title: `Access removed · ${member.name}` });
      void reload();
      return;
    }
    const failure = staffChangeFailure(result.error, member.name);
    toast.show({
      tone: "error",
      title: `Access was not removed. ${failure.text}`,
    });
    if (failure.reload) void reload();
  }

  return (
    <li className="settings-row-item settings-staff__grid">
      <span className="settings-staff__person">
        <span className="settings-avatar" aria-hidden="true">
          {initials(member.name)}
        </span>
        <span className="settings-row-text">
          <span className="settings-row-text__name">{member.name}</span>
          <span className="settings-row-text__sub">{member.email}</span>
          {/* Phones: role and status on line 3, as in "Phone — Settings · Staff". */}
          <span className="settings-row-text__phone">
            {roleLabel}
            {member.status === "active"
              ? null
              : ` · ${memberStatus(member.status)?.label}`}
          </span>
        </span>
      </span>
      <span className="settings-staff__role settings-col--wide">
        {roleLabel}
      </span>
      <span className="settings-col--wide">
        <StatusMark member={member} />
      </span>
      {choices.length || member.manageable ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="settings-more"
            aria-label={`Change ${member.name}`}
            disabled={changing.pending || removing.pending}
          >
            <Icon name="more" {...icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="sale-menu settings-menu">
            {choices.length ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel>Role</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={member.role}
                  onValueChange={(value) => void changeRole(value as string)}
                >
                  {choices.map((choice) => (
                    <DropdownMenuRadioItem
                      key={choice.slug}
                      value={choice.slug}
                    >
                      {choice.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            ) : null}
            {choices.length ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="menu__item--critical"
              onClick={() => setConfirming(true)}
            >
              <Icon name="close" {...icon} />
              Remove access…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="settings-more-slot" aria-hidden="true" />
      )}
      <ConfirmDialog
        open={confirming}
        tone="critical"
        title={`Remove ${member.name}'s access?`}
        confirmLabel="Remove access"
        pendingLabel="Removing…"
        pending={removing.pending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {firstName(member.name)} can no longer open {organization.name}. This
          can take a few minutes. Their past sales stay.
        </p>
      </ConfirmDialog>
    </li>
  );
}

function InvitationRow({
  invitation,
  roles,
}: {
  invitation: TeamInvitation;
  roles: TeamRole[];
}) {
  const organization = useOrganization();
  const reload = useContext(ReloadTeam);
  const toast = useToast();
  const action = useAction(sendRevoke);
  const role = roles.find((item) => item.slug === invitation.role);
  const name = roleName(roles, invitation.role);
  // Rails lets staff revoke only an invitation for a role they could grant.
  const revocable = role?.grantable ?? true;
  const line = invitationLine(invitation.expires_at, organization.timezone);

  async function revoke() {
    const result = await action.run({
      slug: organization.slug,
      invitationId: invitation.id,
    });
    if (result.ok) {
      toast.show({
        tone: "success",
        title: `Invitation revoked · ${invitation.email}`,
      });
      void reload();
      return;
    }
    const failure = staffChangeFailure(
      result.error,
      invitation.email,
      "invitation",
    );
    toast.show({
      tone: "error",
      title: `The invitation was not revoked. ${failure.text}`,
    });
    if (failure.reload) void reload();
  }

  return (
    <li className="settings-row-item settings-staff__grid">
      <span className="settings-staff__person">
        <span
          className="settings-avatar settings-avatar--invite"
          aria-hidden="true"
        >
          <Icon name="send" {...icon} />
        </span>
        <span className="settings-row-text">
          <span className="settings-row-text__name">{invitation.email}</span>
          <span className="settings-row-text__sub settings-row-text__sub--warning">
            {line}
          </span>
          <span className="settings-row-text__phone">{name} · Not joined</span>
        </span>
      </span>
      <span className="settings-staff__role settings-col--wide">{name}</span>
      <span className="settings-col--wide">
        <span className="settings-status settings-status--subtle">
          Not joined
        </span>
      </span>
      {revocable ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="settings-more"
            aria-label={`Change the invitation for ${invitation.email}`}
            disabled={action.pending}
          >
            <Icon name="more" {...icon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="sale-menu settings-menu">
            <DropdownMenuItem
              className="menu__item--critical"
              onClick={() => void revoke()}
            >
              <Icon name="close" {...icon} />
              Revoke invitation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="settings-more-slot" aria-hidden="true" />
      )}
    </li>
  );
}

/** Invite staff: an email and one role card. Only roles the viewer may grant. */
function InviteDialog({
  roles,
  onClose,
}: {
  roles: TeamRole[];
  onClose: () => void;
}) {
  const organization = useOrganization();
  const reload = useContext(ReloadTeam);
  const toast = useToast();
  const action = useAction(sendInvite);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(
    roles.find((item) => item.slug === "receptionist")?.slug ??
      roles[roles.length - 1]?.slug ??
      "",
  );
  const [emailError, setEmailError] = useState<string | undefined>();
  const refused = action.error ? inviteFailure(action.error) : {};
  const fieldError = emailError ?? refused.field;

  async function submit() {
    if (!EMAIL.test(email.trim())) {
      setEmailError("Enter an email address, for example name@example.com");
      return;
    }
    setEmailError(undefined);
    const sent = email.trim();
    const result = await action.run({
      slug: organization.slug,
      email: sent,
      role,
    });
    if (result.ok) {
      toast.show({ tone: "success", title: `Invitation sent · ${sent}` });
      onClose();
      void reload();
    }
  }

  return (
    <SaleDialog
      title="Invite staff"
      wide
      className="settings-form-dialog"
      pending={action.pending}
      onClose={onClose}
      onSubmit={() => void submit()}
      submit={(shortcut) => (
        <SubmitButton
          compact
          pending={action.pending}
          pendingLabel="Sending…"
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          Send invite
          {shortcut}
        </SubmitButton>
      )}
    >
      <div className="settings-field">
        <label className="settings-field__label" htmlFor="invite-email">
          Email
        </label>
        <Input
          id="invite-email"
          type="email"
          className="settings-input"
          value={email}
          autoFocus
          autoComplete="off"
          disabled={action.pending}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "invite-email-error" : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {fieldError ? (
          <FieldError id="invite-email-error">{fieldError}</FieldError>
        ) : null}
      </div>
      <fieldset className="program-kinds settings-roles-pick">
        <legend className="settings-field__label">Role</legend>
        <div className="program-kinds__cards">
          {roles.map((item) => (
            <label key={item.slug} className="program-kind">
              <input
                type="radio"
                name="invite-role"
                className="program-kind__input"
                value={item.slug}
                checked={role === item.slug}
                disabled={action.pending}
                onChange={() => setRole(item.slug)}
              />
              <span className="program-kind__title">{item.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {action.error && !refused.field ? (
        <FormNotice
          title="The invitation was not sent"
          error={action.error}
          text={refused.text}
        />
      ) : null}
    </SaleDialog>
  );
}
