# Records why a member received benefits. Not consumed; its entitlements are.
class BenefitGrant < ApplicationRecord
  include TenantOwned

  belongs_to :member
  belongs_to :fulfillment
  belongs_to :membership_period, optional: true
  has_many :entitlements, dependent: :restrict_with_exception
  same_organization_as :member, :fulfillment, :membership_period

  validates :origin, inclusion: { in: %w[purchase] }

  # Creates the grant and one entitlement per purchased benefit, valid from
  # `starts_at` until `ends_at`. A ticket's program right is scoped to its occurrence.
  # A ticket for several spots multiplies its uses by the line quantity.
  def self.issue!(fulfillment:, at:, starts_at:, ends_at:, period: nil, occurrence: nil)
    grant = create!(
      organization: fulfillment.organization, member: fulfillment.member, fulfillment:,
      membership_period: period, origin: "purchase", granted_at: at
    )
    line = fulfillment.sale_line_item
    fulfillment.sale_line_item.benefit_terms.each do |benefit|
      program_access = benefit.fetch("kind") == "program_access"
      usage_limit = benefit["usage_limit"]
      usage_limit *= line.quantity if usage_limit && occurrence && program_access
      grant.entitlements.create!(
        organization: grant.organization, member: grant.member,
        kind: benefit.fetch("kind"), name: benefit.fetch("name"),
        usage_limit:, location_id: benefit["location_id"],
        program_ids: Array(benefit["program_ids"]), program_kind: benefit["program_kind"],
        occurrence: (occurrence if program_access), starts_at:, ends_at:
      )
    end
    grant
  end
end
