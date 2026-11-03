module Staff
  # POST /staff/programs/:program_id/tickets: adds a ticket price for this
  # program. Change or archive it with /staff/prices/:id.
  class TicketsController < BaseController
    def create
      require_permission! "programs:manage"
      program = current_organization.programs.find(params[:program_id])
      program.add_ticket!(label: params.require(:label), amount_minor: params.require(:amount_minor))
      render_data program.reload.as_detail_api, status: :created
    end
  end
end
