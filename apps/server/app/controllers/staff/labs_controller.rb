module Staff
  # Settings, Labs: staff with settings:manage turn a feature in Labs on or off.
  class LabsController < BaseController
    before_action { require_permission! "settings:manage" }

    def update
      enabled = params.fetch(:enabled)
      unless [ true, false ].include?(enabled)
        raise ErrorResponses::RequestError.new(:bad_request, "bad_request", "enabled must be true or false.")
      end

      render_data current_organization.turn_labs_feature!(params[:key], enabled:).as_labs_api
    end
  end
end
