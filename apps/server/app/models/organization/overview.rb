# Figures for the staff Home screen, for one organization. "Today" starts at
# midnight in the organization's time zone.
#
# - Sales today: sales recorded today, at their total. Void sales are left out.
# - Collected today: payments recorded today. Refunds are not taken off.
# - Due: the balance on open sales that are not fully paid.
# - Memberships ending: access that ends within ENDING_WITHIN, with no later period.
#
# Money is included only for staff who can read sales.
class Organization::Overview
  ENDING_WITHIN = 7.days
  AWAITING_FULFILLMENT_LIMIT = 3

  def initialize(organization, money:, at: Time.current)
    @organization = organization
    @money = money
    @at = at
  end

  def as_api
    {
      currency: @organization.currency,
      member_count: @organization.members.count,
      active_membership_count: @organization.membership_periods.covering(@at).distinct.count(:membership_id),
      memberships_ending_count: memberships_ending_count,
      new_members_today: @organization.members.where(created_at: today).count,
      unpaid_sale_count: unpaid_sales.count,
      awaiting_fulfillment_count: awaiting_fulfillment.count,
      setup: setup,
      **(@money ? { money: money } : {})
    }
  end

  private
    def today = @today ||= @at.in_time_zone(@organization.time_zone).beginning_of_day..@at

    def unpaid_sales = @organization.sales.open.where("sales.paid_minor < sales.total_minor")

    def awaiting_fulfillment
      @organization.sales.open.where("sales.paid_minor = sales.total_minor").where.missing(:fulfillment)
    end

    def memberships_ending_count
      @organization.membership_periods.live.group(:membership_id)
        .having("MAX(ends_at) > :at AND MAX(ends_at) <= :until", at: @at, until: @at + ENDING_WITHIN)
        .count.size
    end

    def setup
      {
        location: @organization.locations.exists?,
        product: @organization.products.exists?,
        member: @organization.members.exists?,
        sale: @organization.sales.exists?
      }
    end

    def money
      sales = @organization.sales.open.where(purchased_at: today)
      by_method = @organization.payments.where(received_at: today).group(:payment_method).sum(:amount_minor)
      oldest = unpaid_sales.order(:purchased_at, :id).first
      {
        sales_today: { count: sales.count, total_minor: sales.sum(:total_minor) },
        collected_today_minor: by_method.values.sum,
        payments_today: Payment::METHODS.map { { method: _1, amount_minor: by_method.fetch(_1, 0) } },
        due: {
          total_minor: unpaid_sales.sum("sales.total_minor - sales.paid_minor").to_i,
          oldest_sale: oldest && { id: oldest.id, purchased_at: ApplicationRecord.api_time(oldest.purchased_at) }
        },
        awaiting_fulfillment: awaiting_fulfillment.includes(:member).order(:purchased_at, :id).limit(AWAITING_FULFILLMENT_LIMIT)
          .map { { sale_id: _1.id, member_name: _1.member.name } }
      }
    end
end
