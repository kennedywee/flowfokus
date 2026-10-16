module Public
  class OrganizationsController < BaseController
    def show
      render_data current_organization.as_public_api
    end
  end
end
