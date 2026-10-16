module Staff
  class OverviewsController < BaseController
    def show
      render_data current_organization.overview
    end
  end
end
