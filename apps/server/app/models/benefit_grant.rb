# Records why a member received benefits. Not consumed; its entitlements are.
class BenefitGrant < ApplicationRecord
  include TenantOwned

  belongs_to :member
  belongs_to :fulfillment
  belongs_to :membership_period, optional: true
  has_many :entitlements, dependent: :restrict_with_exception
  same_organization_as :member, :fulfillment, :membership_period

  validates :origin, inclusion: { in: %w[purchase] }

  # Creates the grant and one entitlement per purchased benefit, valid for the period.
  def self.issue!(fulfillment:, period:, at:)
    grant = create!(
      organization: fulfillment.organization, member: fulfillment.member, fulfillment:,
      membership_period: period, origin: "purchase", granted_at: at
    )
    fulfillment.sale_line_item.benefit_terms.each do |benefit|
      grant.entitlements.create!(
        organization: grant.organization, member: grant.member,
        kind: benefit.fetch("kind"), name: benefit.fetch("name"),
        usage_limit: benefit["usage_limit"], location_id: benefit["location_id"],
        starts_at: period.starts_at, ends_at: period.ends_at
      )
    end
    grant
  end
end
