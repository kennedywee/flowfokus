module Staff
  # Locations keep their history: sales, check-ins, and benefits point at
  # them, so there is no delete.
  class LocationsController < BaseController
    before_action { require_permission! "settings:manage" }

    def create
      location = current_organization.locations.create!(location_params)
      render_data location.as_api, status: :created
    end

    def update
      location = current_organization.locations.find(params[:id])
      location.update!(location_params)
      render_data location.as_api
    end

    private
      def location_params = params.permit(:name, :address)
  end
end
