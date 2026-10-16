# One covered period: starts_at <= time < ends_at. Periods in a membership never
# overlap; a database exclusion constraint enforces this under concurrency.
class MembershipPeriod < ApplicationRecord
  include TenantOwned

  belongs_to :membership
  belongs_to :fulfillment
  has_one :benefit_grant, dependent: :restrict_with_exception
  same_organization_as :membership, :fulfillment

  validates :starts_at, :ends_at, presence: true
  validate :ends_after_start

  scope :covering, ->(at) { where("starts_at <= :at AND ends_at > :at", at:) }

  def as_api
    {
      id:, membership_id:, sale_id: fulfillment.sale_line_item.sale_id, fulfillment_id:,
      starts_at: api_time(starts_at), ends_at: api_time(ends_at)
    }
  end

  private
    def ends_after_start
      errors.add(:ends_at, "must be after starts_at") if starts_at && ends_at && ends_at <= starts_at
    end
end
