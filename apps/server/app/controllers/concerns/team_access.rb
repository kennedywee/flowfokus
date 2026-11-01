# Staff management. Every action needs staff:manage and calls WorkOS.
module TeamAccess
  extend ActiveSupport::Concern

  included do
    before_action { require_permission! Team::MANAGE }
  end

  private
    def team
      @team ||= Team.new(organization: current_organization, actor: Current.user, permissions: Current.permissions)
    end

    def render_team(status: :ok)
      render_data({
        members: team.members.map { member_api(_1) },
        invitations: team.invitations.map { invitation_api(_1) },
        roles: team.roles.map { |role| role.merge(grantable: (role[:permissions] - team.permissions).empty?) }
      }, status:)
    end

    def member_api(membership)
      {
        id: membership.id, name: membership.user.name, email: membership.user.email,
        role: membership.role, role_name: team.roles.find { _1[:slug] == membership.role }&.dig(:name) || membership.role.humanize,
        status: membership.status, you: membership.user_id == Current.user.id, manageable: team.manageable?(membership)
      }
    end

    def invitation_api(invitation)
      {
        id: invitation["id"], email: invitation["email"], role: invitation["role_slug"], state: invitation["state"],
        expires_at: WorkosSynced.time(invitation["expires_at"])&.utc&.iso8601(3),
        accept_url: invitation["accept_invitation_url"]
      }
    end
end
