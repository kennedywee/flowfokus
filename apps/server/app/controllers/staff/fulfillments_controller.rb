module Staff
  class FulfillmentsController < BaseController
    def create
      require_permission! "purchases:fulfill"
      sale = current_organization.sales.includes(:line_item).find(params[:sale_id])
      early_reason = params[:early_reason].presence
      require_permission! "purchases:fulfill_unpaid" if early_reason && !sale.paid_in_full?
      _fulfillment, created = sale.fulfill!(actor: Current.user, early_reason:)
      render_data current_organization.sales.with_details.find(sale.id).as_api, status: created_or_replayed(created)
    end
  end
end
