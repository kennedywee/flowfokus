module Staff
  class ProductsController < BaseController
    def index
      require_permission! "products:read"
      # Tickets are managed on their program's page.
      render_data current_organization.products.offers.includes(:benefits, :prices).map(&:as_staff_api)
    end

    def create
      require_permission! "products:create"
      product = current_organization.products.new(product_params.merge(kind: offer_kind))
      product.replace_benefits(benefit_params)
      product.save!
      render_data product.reload.as_staff_api, status: :created
    end

    def update
      require_permission! "products:update"
      product = current_organization.products.offers.includes(:benefits, :prices).find(params[:id])
      product.assign_attributes(product_params)
      product.replace_benefits(benefit_params) if params.key?(:benefits)
      product.save!
      render_data product.reload.as_staff_api
    end

    private
      def product_params = params.permit(:name, :description, :published)
      def benefit_params
        params.permit(benefits: [ :kind, :name, :usage_limit, :location_id, :program_kind, { program_ids: [] } ]).fetch(:benefits, [])
      end

      # Offers are memberships or passes. Tickets are made from a program.
      def offer_kind
        kind = params.fetch(:kind, "membership").to_s
        raise ActionController::BadRequest, "kind must be membership or pass" unless %w[membership pass].include?(kind)

        kind
      end
  end
end
