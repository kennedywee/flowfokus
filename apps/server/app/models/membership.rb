# A member's continuing membership. One per member per organization.
# A renewal adds a period; it never creates a second membership.
class Membership < ApplicationRecord
  include TenantOwned

  belongs_to :member
  has_many :periods, -> { order(:starts_at) }, class_name: "MembershipPeriod", dependent: :restrict_with_exception
  has_many :fulfillments, dependent: :restrict_with_exception
  same_organization_as :member

  # Finds or creates the member's membership and locks it for this transaction.
  # The lock serializes concurrent renewals so periods cannot overlap.
  def self.lock_for!(member)
    membership = create_or_find_by!(organization_id: member.organization_id, member_id: member.id)
    membership.lock!
    membership
  end

  # New access starts at purchase time, or after the latest period when that ends later.
  def next_start(purchased_at)
    [ purchased_at, periods.maximum(:ends_at) ].compact.max
  end

  def as_api
    { id:, created_at: api_time(created_at), periods: periods.includes(fulfillment: :sale_line_item).map(&:as_api) }
  end
end
