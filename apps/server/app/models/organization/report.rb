# Weekly figures for one organization, in its own time zone. Weeks start on
# Monday. The last week is the current, partial week.
#
# - Sales: sales recorded in the week, at their total. Void sales are left out.
# - Payments and refunds: money recorded in the week, by when it was recorded.
# - Check-ins: granted (including staff overrides) and denied attempts.
class Organization::Report
  WEEK_COUNTS = [ 1, 2, 4, 12 ].freeze

  def initialize(organization, weeks:, at: Time.current)
    @organization = organization
    @weeks = WEEK_COUNTS.include?(weeks.to_i) ? weeks.to_i : 4
    @at = at
  end

  def as_api
    {
      currency: @organization.currency, timezone: @organization.timezone,
      from: api_time(range.begin), through: api_time(range.end),
      weeks: week_starts.map { |start| week_api(start) },
      by_location: by_location, by_method: by_method
    }
  end

  private
    def zone = @organization.time_zone

    def week_starts
      @week_starts ||= begin
        current = @at.in_time_zone(zone).to_date.beginning_of_week(:monday)
        (0...@weeks).map { current - (_1 * 7) }.reverse
      end
    end

    def range
      @range ||= begin
        first = week_starts.first
        zone.local(first.year, first.month, first.day)..@at
      end
    end

    def week_of(time) = time.in_time_zone(zone).to_date.beginning_of_week(:monday)

    def sales = @sales ||= @organization.sales.open.where(purchased_at: range).pluck(:purchased_at, :total_minor, :location_id)
    def payments = @payments ||= @organization.payments.where(received_at: range).pluck(:received_at, :amount_minor, :payment_method)
    def refunds = @refunds ||= @organization.refunds.where(refunded_at: range).pluck(:refunded_at, :amount_minor)
    def check_ins = @check_ins ||= @organization.check_ins.where(checked_in_at: range).pluck(:checked_in_at, :result)
    def members = @members ||= @organization.members.where(created_at: range).pluck(:created_at)

    def week_api(start)
      in_week = ->(rows) { rows.select { week_of(_1.first) == start } }
      week_sales = in_week.(sales)
      week_check_ins = in_week.(check_ins)
      {
        starts_on: start.iso8601,
        sale_count: week_sales.size,
        sales_minor: week_sales.sum { _1[1] },
        payments_minor: in_week.(payments).sum { _1[1] },
        refunds_minor: in_week.(refunds).sum { _1[1] },
        check_ins_granted: week_check_ins.count { _1[1] == "granted" },
        check_ins_denied: week_check_ins.count { _1[1] == "denied" },
        new_members: members.count { week_of(_1) == start }
      }
    end

    def by_location
      totals = sales.group_by(&:last).transform_values { |rows| rows.sum { _1[1] } }
      @organization.locations.map { { location_id: _1.id, name: _1.name, sales_minor: totals.fetch(_1.id, 0) } }
    end

    def by_method
      totals = payments.group_by(&:last).transform_values { |rows| rows.sum { _1[1] } }
      Payment::METHODS.map { { method: _1, payments_minor: totals.fetch(_1, 0) } }
    end

    def api_time(value) = ApplicationRecord.api_time(value)
end
