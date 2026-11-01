module Staff
  class OrganizationsController < BaseController
    def show
      render_organization
    end

    # The name comes from WorkOS. The currency stays fixed, because prices and
    # sales are recorded in it.
    def update
      require_permission! "settings:manage"
      current_organization.update!(params.permit(:timezone, :published))
      render_organization
    end

    private
      def render_organization
        render_data current_organization.reload.as_staff_api(user: Current.user, permissions: Current.permissions, demo: Current.demo)
      end
  end
end
