module Staff
  class ProgramsController < BaseController
    def index
      require_permission! "programs:read"
      programs = current_organization.programs.by_name.to_a
      upcoming = current_organization.occurrences.live.upcoming.group(:program_id).count
      render_data programs.map { _1.as_api.merge(upcoming_count: upcoming.fetch(_1.id, 0)) }
    end

    def show
      require_permission! "programs:read"
      render_data find_program.as_detail_api
    end

    def create
      require_permission! "programs:manage"
      program = current_organization.programs.create!(program_params)
      render_data program.as_detail_api, status: :created
    end

    def update
      require_permission! "programs:manage"
      program = find_program
      program.update!(program_params.except(:kind))
      render_data program.as_detail_api
    end

    private
      def find_program(id = params[:id]) = current_organization.programs.includes(:location).find(id)

      def program_params
        params.permit(:name, :description, :kind, :location_id, :capacity, :duration_minutes, :host_name, :published)
      end
  end
end
