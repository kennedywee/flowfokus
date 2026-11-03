module Public
  class ProductsController < BaseController
    def index
      location_names = current_organization.locations.pluck(:id, :name).to_h
      program_names = current_organization.programs.published.pluck(:id, :name).to_h
      # Tickets are sold from the schedule, one time at a time.
      products = current_organization.products.offers.published.includes(:benefits, :prices)
        .select { |product| product.prices.any?(&:sellable?) }
      render_data products.map { |product| product.as_public_api(location_names, program_names) }
    end
  end
end
