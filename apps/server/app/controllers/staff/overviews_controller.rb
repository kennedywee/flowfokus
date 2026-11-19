module Staff
  class OverviewsController < BaseController
    def show
      render_data Organization::Overview.new(current_organization, money: permitted?("purchases:read")).as_api
    end
  end
end
