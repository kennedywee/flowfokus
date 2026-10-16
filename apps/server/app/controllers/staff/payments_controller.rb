module Staff
  class PaymentsController < BaseController
    def create
      require_permission! "payments:create"
      sale = current_organization.sales.find(params[:sale_id])
      _payment, created = sale.record_payment!(
        actor: Current.user, idempotency_key: idempotency_key!,
        amount_minor: params[:amount_minor], method: params[:method], reference: params[:reference]
      )
      render_data current_organization.sales.with_details.find(sale.id).as_api, status: created_or_replayed(created)
    end
  end
end
