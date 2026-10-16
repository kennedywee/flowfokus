module Public
  class ProductsController < BaseController
    def index
      location_names = current_organization.locations.pluck(:id, :name).to_h
      products = current_organization.products.published.includes(:benefits, :prices)
        .select { |product| product.prices.any?(&:sellable?) }
      render_data products.map { |product| product.as_public_api(location_names) }
    end
  end
end
