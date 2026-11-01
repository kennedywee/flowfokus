module Staff
  # GET /staff/team: members from the synced copy, with roles and pending
  # invitations read from WorkOS now.
  class TeamController < BaseController
    include TeamAccess

    def show = render_team
  end
end
