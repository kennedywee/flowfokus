module Staff
  # Prices never change amount, currency, or duration. Create a new price
  # instead, then archive the old one. Every action returns the whole product.
  class PricesController < BaseController
    before_action { require_permission! "products:update" }

    def create
      product = current_organization.products.find(params[:product_id])
      product.add_price!(label: params[:label], amount_minor: params[:amount_minor], duration_days: params[:duration_days])
      render_product product, status: :created
    end

    def update
      price = find_price
      price.update!(params.permit(:label, :available))
      render_product price.product
    end

    def archive
      price = find_price
      price.archive! unless price.archived_at
      render_product price.product
    end

    private
      def find_price = current_organization.prices.find(params[:id])

      def render_product(product, status: :ok)
        render_data current_organization.products.includes(:benefits, :prices).find(product.id).as_staff_api, status:
      end
  end
end
