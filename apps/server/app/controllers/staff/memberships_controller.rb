module Staff
  # GET /staff/memberships: the organizations the signed-in staff user can open.
  #
  # Needs a verified token, but no Flowfokus-Organization header: the portal
  # calls it before it knows which organization to open. The list comes from the
  # synced copy, so it only helps navigation. Opening an organization still needs
  # a token for that organization, which WorkOS issues only to active members.
  class MembershipsController < ApplicationController
    include Authentication

    def index
      claims = verified_claims!
      user = user_for!(claims)

      if (current = claims.organization_workos_id && Organization.find_by(workos_id: claims.organization_workos_id)) && !claims.demo?
        OrganizationMembership.observe!(organization: current, user:, role: claims.role)
      end

      memberships = user.organization_memberships.active.joins(:organization)
        .where.not(organizations: { workos_id: nil }).includes(:organization).order("organizations.name")
      # The demo token works for its one organization only.
      memberships = memberships.where(organizations: { workos_id: claims.organization_workos_id }) if claims.demo?

      render_data memberships.map(&:as_api)
    end
  end
end
