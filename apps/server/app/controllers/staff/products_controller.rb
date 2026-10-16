module Staff
  class ProductsController < BaseController
    def index
      require_permission! "products:read"
      render_data current_organization.products.includes(:benefits, :prices).map(&:as_staff_api)
    end
  end
end
