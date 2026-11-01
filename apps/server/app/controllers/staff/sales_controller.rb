module Staff
  class SalesController < BaseController
    def index
      require_permission! "purchases:read"
      sales = current_organization.sales.with_details.newest_first.limit(100)
      sales = sales.where(member_id: params[:member_id]) if params[:member_id].present?
      render_data sales.map(&:as_api)
    end

    def show
      require_permission! "purchases:read"
      render_data find_sale.as_api
    end

    def create
      require_permission! "purchases:create"
      sale, created = Sale.record!(
        organization: current_organization, actor: Current.user, idempotency_key: idempotency_key!,
        member_id: params[:member_id], price_id: params[:price_id], location_id: params[:location_id]
      )
      render_data find_sale(sale.id).as_api, status: created_or_replayed(created)
    end

    # Cancels a sale that delivered nothing and kept no money.
    def void
      require_permission! "purchases:void"
      sale = current_organization.sales.find(params[:id])
      sale.void!(actor: Current.user, reason: params.require(:reason))
      render_data find_sale(sale.id).as_api
    end

    # Ends the access from this sale's delivery only.
    def revoke
      require_permission! "memberships:revoke"
      sale = current_organization.sales.includes(line_item: :fulfillment).find(params[:id])
      sale.revoke!(actor: Current.user, reason: params.require(:reason))
      render_data find_sale(sale.id).as_api
    end

    private
      def find_sale(id = params[:id]) = current_organization.sales.with_details.find(id)
  end
end
