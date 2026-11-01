module Staff
  class TeamMembersController < BaseController
    include TeamAccess

    def update
      team.change_role!(find_membership, params.require(:role))
      render_team
    end

    def destroy
      team.remove!(find_membership)
      render_team
    end

    private
      def find_membership = current_organization.organization_memberships.live.find(params[:id])
  end
end
