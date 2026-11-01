module Staff
  class TeamInvitationsController < BaseController
    include TeamAccess

    def create
      team.invite!(email: params.require(:email), role: params.require(:role))
      render_team status: :created
    end

    def revoke
      team.revoke_invitation!(params[:id])
      render_team
    end
  end
end
