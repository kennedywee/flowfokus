module MemberArea
  # GET /member/occurrences/:id: one time of a published program, and how the
  # signed-in member could book it.
  class OccurrencesController < BaseController
    def show
      occurrence = Current.organization.occurrences.includes(program: :location)
        .joins(:program).merge(Program.published).find(params[:id])
      program = occurrence.program
      render_data occurrence.options_for(Current.member).merge(
        occurrence: occurrence.as_public_api,
        program: program.as_public_api({ program.location_id => program.location.name })
      )
    end
  end
end
