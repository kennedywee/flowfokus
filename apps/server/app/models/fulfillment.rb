# Delivers one line item's purchased terms: a membership period, a benefit
# grant, and its entitlements. One fulfillment per line item; a retry returns
# the existing fulfillment and creates nothing.
class Fulfillment < ApplicationRecord
  include TenantOwned

  class SaleNotPaid < StandardError; end

  belongs_to :sale_line_item
  belongs_to :member
  belongs_to :membership
  belongs_to :fulfilled_by_user, class_name: "User"
  has_one :membership_period, dependent: :restrict_with_exception
  has_one :benefit_grant, dependent: :restrict_with_exception
  same_organization_as :sale_line_item, :member, :membership

  # Returns [fulfillment, created].
  def self.deliver!(line_item, actor:, at: Time.current)
    sale = line_item.sale

    transaction(requires_new: true) do
      sale.lock!
      if (existing = find_by(sale_line_item: line_item))
        next [ existing, false ]
      end
      unless sale.paid_in_full?
        raise SaleNotPaid, "The sale has an unpaid balance of #{sale.balance_minor}. Record full payment first."
      end

      membership = Membership.lock_for!(sale.member)
      starts_at = membership.next_start(sale.purchased_at)
      ends_at = starts_at + line_item.duration

      fulfillment = create!(
        organization: sale.organization, sale_line_item: line_item, member: sale.member,
        membership:, fulfilled_by_user: actor, fulfilled_at: at
      )
      period = fulfillment.create_membership_period!(
        organization: sale.organization, membership:, starts_at:, ends_at:
      )
      BenefitGrant.issue!(fulfillment:, period:, at:)

      [ fulfillment, true ]
    end
  end

  def as_api
    {
      id:, sale_line_item_id:, membership_id:,
      membership_period: membership_period.as_api,
      fulfilled_at: api_time(fulfilled_at)
    }
  end
end
