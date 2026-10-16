# A usable right with validity, location scope, and a usage limit.
class Entitlement < ApplicationRecord
  include TenantOwned

  belongs_to :benefit_grant
  belongs_to :member
  belongs_to :location, optional: true
  has_many :usages, class_name: "EntitlementUsage", dependent: :restrict_with_exception
  same_organization_as :benefit_grant, :member, :location

  validates :kind, inclusion: { in: %w[gym_access] }
  validates :name, presence: true
  validates :usage_limit, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :used_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :valid_at, ->(at) { where("starts_at <= :at AND ends_at > :at", at:) }

  def unlimited? = usage_limit.nil?
  def remaining = unlimited? ? nil : usage_limit - used_count
  def usable? = unlimited? || remaining.positive?
  def covers_location?(location) = location_id.nil? || location_id == location.id
  def active?(at = Time.current) = starts_at <= at && at < ends_at

  def as_api(at: Time.current)
    {
      id:, kind:, name:, starts_at: api_time(starts_at), ends_at: api_time(ends_at),
      location_id:, usage_limit:, used_count:, remaining:, active: active?(at)
    }
  end
end
