module Public
  # GET /public/schedule: published programs and their times for the next days.
  class SchedulesController < BaseController
    DEFAULT_DAYS = 14
    MAX_DAYS = 31

    def show
      days = params[:days].present? ? Integer(params[:days], exception: false) : DEFAULT_DAYS
      raise ActionController::BadRequest, "days must be between 1 and #{MAX_DAYS}" unless days&.between?(1, MAX_DAYS)

      organization = current_organization
      zone = organization.time_zone
      from = zone.now.beginning_of_day
      programs = organization.programs.published.includes(:location, ticket_products: :prices).by_name.to_a
      occurrences = organization.occurrences.where(program_id: programs.map(&:id))
        .where(starts_at: from...(from + days.days)).chronological.to_a
      taken = Occurrence.taken_counts(occurrences.map(&:id))
      offers = organization.products.offers.published.includes(:benefits, :prices).to_a
      location_names = organization.locations.pluck(:id, :name).to_h

      render_data({
        programs: programs.map { |program|
          program.as_public_api(location_names).merge(
            ticket_prices: program.ticket_prices.map(&:as_public_api),
            accepted_by: program.accepted_products(offers).select { _1.prices.any?(&:sellable?) }.map(&:name)
          )
        },
        occurrences: occurrences.map { _1.as_public_api(taken: taken.fetch(_1.id, 0)) }
      })
    end
  end
end
