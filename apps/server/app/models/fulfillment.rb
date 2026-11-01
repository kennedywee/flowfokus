# Delivers one line item's purchased terms: a membership period, a benefit
# grant, and its entitlements. One fulfillment per line item; a retry returns
# the existing fulfillment and creates nothing.
class Fulfillment < ApplicationRecord
  include TenantOwned

  class SaleNotPaid < StandardError; end
  class NotDelivered < StandardError
    def initialize(msg = "This sale has not been delivered, so there is no access to revoke.") = super
  end

  validates :early_reason, length: { maximum: 500 }

  belongs_to :sale_line_item
  belongs_to :member
  belongs_to :membership
  belongs_to :fulfilled_by_user, class_name: "User"
  belongs_to :revoked_by_user, class_name: "User", optional: true
  has_one :membership_period, dependent: :restrict_with_exception
  has_one :benefit_grant, dependent: :restrict_with_exception
  same_organization_as :sale_line_item, :member, :membership

  # Returns [fulfillment, created].
  #
  # A sale with a balance needs `early_reason`. The caller checks the
  # permission. A sale paid in full by the time the lock is held ignores it.
  def self.deliver!(line_item, actor:, at: Time.current, early_reason: nil)
    sale = line_item.sale

    transaction(requires_new: true) do
      sale.lock!
      if (existing = find_by(sale_line_item: line_item))
        next [ existing, false ]
      end
      early_reason = early_reason.to_s.strip.presence unless sale.paid_in_full?
      raise Sale::Voided if sale.voided?
      unless sale.paid_in_full? || early_reason
        raise SaleNotPaid, "The sale has an unpaid balance of #{sale.balance_minor}. Record full payment first."
      end

      membership = Membership.lock_for!(sale.member)
      starts_at = membership.next_start(sale.purchased_at)
      ends_at = starts_at + line_item.duration

      fulfillment = create!(
        organization: sale.organization, sale_line_item: line_item, member: sale.member,
        membership:, fulfilled_by_user: actor, fulfilled_at: at,
        early_reason: (early_reason unless sale.paid_in_full?), unpaid_minor: sale.balance_minor
      )
      period = fulfillment.create_membership_period!(
        organization: sale.organization, membership:, starts_at:, ends_at:
      )
      BenefitGrant.issue!(fulfillment:, period:, at:)

      [ fulfillment, true ]
    end
  end

  def revoked? = revoked_at.present?

  # Ends the access from this delivery only: its period and its entitlements.
  # Other periods, the sale, and its payments stay as they are. Usage already
  # recorded stays. Returns [fulfillment, changed].
  def revoke!(actor:, reason:, at: Time.current)
    transaction do
      Membership.lock_for!(member)
      lock!
      next [ self, false ] if revoked?

      update!(revoked_at: at, revoked_by_user: actor, revoke_reason: reason.to_s.strip.presence)
      membership_period.update!(revoked_at: at)
      benefit_grant.entitlements.update_all(revoked_at: at, updated_at: at)
      [ self, true ]
    end
  end

  def as_api
    {
      id:, sale_line_item_id:, membership_id:,
      membership_period: membership_period.as_api,
      fulfilled_at: api_time(fulfilled_at),
      early: unpaid_minor.positive?, early_reason:, unpaid_minor:,
      revoked_at: api_time(revoked_at), revoke_reason:
    }
  end
end
