module Staff
  # Times of programs: the schedule, adding times, the roster, and cancelling a time.
  class OccurrencesController < BaseController
    DEFAULT_DAYS = 14
    MAX_DAYS = 62

    # GET /staff/occurrences: times from the start of `from` (default today) for `days`.
    def index
      require_permission! "programs:read"
      zone = current_organization.time_zone
      from = (params[:from].present? ? Date.iso8601(params[:from]) : zone.today).then { zone.local(_1.year, _1.month, _1.day) }
      days = params[:days].present? ? Integer(params[:days], exception: false) : DEFAULT_DAYS
      raise ActionController::BadRequest, "days must be between 1 and #{MAX_DAYS}" unless days&.between?(1, MAX_DAYS)

      occurrences = current_organization.occurrences.includes(:program)
        .where(starts_at: from...(from + days.days)).chronological.to_a
      taken = Occurrence.taken_counts(occurrences.map(&:id))
      render_data occurrences.map { |occurrence|
        occurrence.as_api(taken: taken.fetch(occurrence.id, 0)).merge(program: occurrence.program.as_summary_api)
      }
    rescue Date::Error
      raise ActionController::BadRequest, "from must be YYYY-MM-DD"
    end

    # GET /staff/occurrences/:id: the roster.
    def show
      require_permission! "programs:read"
      render_roster find_occurrence
    end

    # POST /staff/programs/:program_id/occurrences: one time, or the same time weekly.
    def create
      require_permission! "programs:manage"
      program = current_organization.programs.find(params[:program_id])
      program.schedule!(date: params.require(:date), time: params.require(:time), weeks: params.fetch(:weeks, 1))
      render_data program.reload.as_detail_api, status: :created
    end

    def cancel
      require_permission! "programs:manage"
      occurrence = find_occurrence
      occurrence.cancel!(actor: Current.user, reason: params.require(:reason))
      render_roster occurrence.reload
    end

    private
      def find_occurrence = current_organization.occurrences.includes(program: :location).find(params[:id])
  end
end
