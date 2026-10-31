module Staff
  class ProductsController < BaseController
    def index
      require_permission! "products:read"
      render_data current_organization.products.includes(:benefits, :prices).map(&:as_staff_api)
    end

    def create
      require_permission! "products:create"
      product = current_organization.products.new(product_params)
      product.replace_benefits(benefit_params)
      product.save!
      render_data product.reload.as_staff_api, status: :created
    end

    def update
      require_permission! "products:update"
      product = current_organization.products.includes(:benefits, :prices).find(params[:id])
      product.assign_attributes(product_params)
      product.replace_benefits(benefit_params) if params.key?(:benefits)
      product.save!
      render_data product.reload.as_staff_api
    end

    private
      def product_params = params.permit(:name, :description, :published)
      def benefit_params = params.permit(benefits: %i[name usage_limit location_id]).fetch(:benefits, [])
  end
end
