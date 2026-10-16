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

    private
      def find_sale(id = params[:id]) = current_organization.sales.with_details.find(id)
  end
end
