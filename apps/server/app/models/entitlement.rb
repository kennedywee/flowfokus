# A usable right with validity, location scope, and a usage limit.
#
# `gym_access` is a record of gym access that a product grants. No screen uses it
# to record visits. `program_access` books spots in programs: any program, all of
# one kind, selected programs, or one occurrence.
class Entitlement < ApplicationRecord
  include TenantOwned

  KINDS = %w[gym_access program_access].freeze

  belongs_to :benefit_grant
  belongs_to :member
  belongs_to :location, optional: true
  belongs_to :occurrence, optional: true
  has_many :usages, class_name: "EntitlementUsage", dependent: :restrict_with_exception
  has_many :bookings, dependent: :restrict_with_exception
  same_organization_as :benefit_grant, :member, :location, :occurrence

  validates :kind, inclusion: { in: KINDS }
  validates :name, presence: true
  validates :usage_limit, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :used_count, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :live, -> { where(revoked_at: nil) }
  scope :valid_at, ->(at) { live.where("starts_at <= :at AND ends_at > :at", at:) }
  scope :program_access, -> { where(kind: "program_access") }

  def unlimited? = usage_limit.nil?
  def remaining = unlimited? ? nil : usage_limit - used_count
  def usable? = unlimited? || remaining.positive?
  def covers_location?(location) = location_id.nil? || location_id == location.id
  def active?(at = Time.current) = starts_at <= at && at < ends_at
  def program_access? = kind == "program_access"

  # True when this right may book a spot in the occurrence: program access,
  # not revoked, valid when the occurrence starts, at its location, in scope.
  def covers_occurrence?(occurrence)
    program = occurrence.program
    program_access? && revoked_at.nil? && active?(occurrence.starts_at) &&
      covers_location?(program.location) && covers_program?(program) &&
      (occurrence_id.nil? || occurrence_id == occurrence.id)
  end

  def covers_program?(program) = ProgramScope.new(program_ids:, program_kind:).covers?(program)

  def as_api(at: Time.current)
    {
      id:, kind:, name:, starts_at: api_time(starts_at), ends_at: api_time(ends_at),
      location_id:, usage_limit:, used_count:, remaining:, active: active?(at),
      program_ids:, program_kind:, occurrence_id:
    }
  end
end
