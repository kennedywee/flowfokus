module Staff
  class RefundsController < BaseController
    def create
      require_permission! "purchases:refund"
      sale = current_organization.sales.find(params[:sale_id])
      _refund, created = sale.record_refund!(
        actor: Current.user, idempotency_key: idempotency_key!,
        payment_id: params[:payment_id], amount_minor: params[:amount_minor], reason: params[:reason]
      )
      render_data current_organization.sales.with_details.find(sale.id).as_api, status: created_or_replayed(created)
    end
  end
end
