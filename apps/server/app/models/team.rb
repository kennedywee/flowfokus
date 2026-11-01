# The staff of one organization, managed through WorkOS.
#
# WorkOS is the authority for staff access. Rails checks each change before it
# calls WorkOS, then applies the answer to the local copy at once. The webhook
# that follows changes nothing more.
#
# Rules:
# - Nobody can grant a role with permissions they do not hold themselves.
# - Nobody can change or remove a member whose role holds permissions they lack.
# - Nobody can change their own role or remove themselves.
# - At least one active member must keep staff:manage.
#
# The checks read the current memberships and roles from WorkOS, not the local
# copy. The actor's own permissions come from their verified token.
class Team
  MANAGE = "staff:manage".freeze
  INVITATION_ID = /\Ainvitation_[A-Za-z0-9]{1,100}\z/

  # The change breaks a rule. The message says which.
  class Refused < StandardError; end

  attr_reader :organization, :actor, :permissions

  def initialize(organization:, actor:, permissions:, api: Flowfokus::WorkosApi.from_env)
    @organization, @actor, @permissions, @api = organization, actor, permissions.to_a, api
  end

  def roles
    @roles ||= @api.roles(organization.workos_id).map do |role|
      { slug: role["slug"], name: role["name"].presence || role["slug"].humanize, permissions: Array(role["permissions"]).grep(String) }
    end
  end

  def members
    organization.organization_memberships.live.includes(:user).sort_by { [ _1.user.name.downcase, _1.id ] }
  end

  def invitations
    @api.invitations(organization.workos_id).select { _1["state"] == "pending" && _1["organization_id"] == organization.workos_id }
  end

  def invite!(email:, role:)
    email = email.to_s.strip.downcase
    raise Refused, "Enter a valid email address." unless email.match?(/\A[^@\s]+@[^@\s]+\.[^@\s]+\z/) && email.length <= 320

    grantable_role!(role)
    @api.create_invitation(email:, organization_id: organization.workos_id, role_slug: role, inviter_user_id: actor.workos_id)
  end

  def revoke_invitation!(id)
    raise ActiveRecord::RecordNotFound unless INVITATION_ID.match?(id.to_s)

    invitation = @api.invitation(id)
    raise ActiveRecord::RecordNotFound unless invitation["organization_id"] == organization.workos_id
    raise Refused, "Only a pending invitation can be revoked." unless invitation["state"] == "pending"

    grantable_role!(invitation["role_slug"]) if invitation["role_slug"].present?
    @api.revoke_invitation(id)
  rescue Flowfokus::WorkosApi::NotFound
    raise ActiveRecord::RecordNotFound
  end

  def change_role!(membership, role)
    remote = manageable!(membership)
    return membership if (OrganizationMembership.role_slug(remote) || membership.role) == role

    grantable_role!(role)
    keeps_a_manager!(remote, unless_role: role)
    apply! @api.update_membership_role(remote["id"], role)
  end

  def remove!(membership)
    remote = manageable!(membership)
    keeps_a_manager!(remote)
    @api.delete_membership(remote["id"])
    OrganizationMembership.transaction { OrganizationMembership.sync_from_workos!(remote, deleted: true) }
    membership.reload
  end

  def permissions_for(role_slug) = roles.find { _1[:slug] == role_slug }&.dig(:permissions)

  # True when the actor may change this member, apart from the last-manager rule.
  def manageable?(membership)
    return false if membership.user_id == actor.id || membership.workos_id.blank?

    held = permissions_for(membership.role)
    held.present? && (held - permissions).empty?
  end

  private
    def grantable_role!(slug)
      held = permissions_for(slug)
      raise Refused, "The role #{slug.inspect} does not exist." if held.nil?

      missing = held - permissions
      raise Refused, "You cannot grant #{slug}: it includes #{missing.join(', ')}, which you do not hold." if missing.any?
    end

    # Reads the membership from WorkOS and checks that the actor may change it.
    def manageable!(membership)
      raise Refused, "You cannot change your own access. Ask another manager." if membership.user_id == actor.id
      raise Refused, "This membership has not synced from WorkOS yet. Try again in a moment." if membership.workos_id.blank?

      remote = WorkosSynced.fetched!(@api.organization_membership(membership.workos_id), membership.workos_id)
      raise ActiveRecord::RecordNotFound unless remote["organization_id"] == organization.workos_id

      current = OrganizationMembership.role_slug(remote) || membership.role
      held = permissions_for(current) || []
      missing = held - permissions
      raise Refused, "#{membership.user.name} holds #{missing.join(', ')}, which you do not hold." if missing.any?

      remote
    rescue Flowfokus::WorkosApi::NotFound
      raise Refused, "WorkOS no longer has this membership. Reload the team."
    end

    def keeps_a_manager!(remote, unless_role: nil)
      return unless permissions_for(OrganizationMembership.role_slug(remote)).to_a.include?(MANAGE)
      return if unless_role && permissions_for(unless_role).to_a.include?(MANAGE)

      others = @api.organization_memberships(organization.workos_id).count do |other|
        other["id"] != remote["id"] && other["status"] == "active" &&
          permissions_for(OrganizationMembership.role_slug(other)).to_a.include?(MANAGE)
      end
      raise Refused, "At least one active member must keep #{MANAGE}." if others.zero?
    end

    def apply!(data)
      OrganizationMembership.transaction { OrganizationMembership.sync_from_workos!(data, authoritative: true) }
      organization.organization_memberships.live.find_by!(workos_id: data["id"])
    rescue OrganizationMembership::Superseded
      organization.organization_memberships.live.find_by!(workos_id: data["id"])
    end
end
