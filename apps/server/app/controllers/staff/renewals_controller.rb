module Staff
  class RenewalsController < BaseController
    def create
      require_permission! "purchases:create"
      sale, created = Sale.renew!(
        organization: current_organization, actor: Current.user, idempotency_key: idempotency_key!,
        member_id: params[:member_id], location_id: params[:location_id]
      )
      render_data current_organization.sales.with_details.find(sale.id).as_api, status: created_or_replayed(created)
    end
  end
end
