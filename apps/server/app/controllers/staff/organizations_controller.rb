module Staff
  class OrganizationsController < BaseController
    def show
      render_data current_organization.as_staff_api(user: Current.user, permissions: Current.permissions, demo: Current.demo)
    end
  end
end
