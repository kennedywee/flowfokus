module Staff
  class CheckInsController < BaseController
    def index
      require_permission! "check_ins:read"
      check_ins = current_organization.check_ins.includes(:member).newest_first.limit(100)
      check_ins = check_ins.where(member_id: params[:member_id]) if params[:member_id].present?
      render_data check_ins.map(&:as_api)
    end

    def create
      require_permission! "check_ins:create"
      check_in, created = CheckIn.record!(
        organization: current_organization, actor: Current.user, idempotency_key: idempotency_key!,
        member_id: params[:member_id], location_id: params[:location_id]
      )
      render_data check_in.as_api, status: created_or_replayed(created)
    end
  end
end
