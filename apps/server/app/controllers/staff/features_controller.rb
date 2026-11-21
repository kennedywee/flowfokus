module Staff
  # Developer features: the state of every feature for this organization.
  # Only the Developer role holds features:manage, so a gym cannot turn its
  # own features On.
  class FeaturesController < BaseController
    before_action { require_permission! "features:manage" }

    def index
      render_features
    end

    def update
      current_organization.change_feature!(params[:key], state: params.require(:state))
      render_features
    end

    private
      def render_features
        render_data({
          workos_organization_id: current_organization.workos_id,
          features: current_organization.feature_list.map(&:as_api)
        })
      end
  end
end
