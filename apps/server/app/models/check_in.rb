# An access attempt by a member at a location. Granted attempts consume one use
# of an entitlement in the same transaction. Denied attempts record a reason and
# consume nothing.
class CheckIn < ApplicationRecord
  include TenantOwned
  include Idempotent

  DENIAL_REASONS = %w[no_entitlement location_not_allowed usage_limit_reached].freeze

  belongs_to :member
  belongs_to :location
  belongs_to :entitlement, optional: true
  belongs_to :recorded_by_user, class_name: "User"
  has_one :usage, class_name: "EntitlementUsage", dependent: :restrict_with_exception
  same_organization_as :member, :location, :entitlement

  validates :result, inclusion: { in: %w[granted denied] }
  validates :denial_reason, inclusion: { in: DENIAL_REASONS }, allow_nil: true

  scope :newest_first, -> { order(checked_in_at: :desc, id: :desc) }

  # Returns [check_in, created]. A retry with the same key never consumes twice.
  def self.record!(organization:, actor:, idempotency_key:, member_id:, location_id:, at: Time.current)
    fingerprint = Idempotent.fingerprint(member_id:, location_id:)
    if (existing = replay(organization.check_ins, key: idempotency_key, fingerprint:))
      return [ existing, false ]
    end

    member = organization.members.find_by(id: member_id)
    location = organization.locations.find_by(id: location_id)
    check_in = organization.check_ins.new(
      member:, location:, recorded_by_user: actor, checked_in_at: at,
      idempotency_key:, request_fingerprint: fingerprint
    )
    check_in.errors.add(:member_id, "was not found") unless member
    check_in.errors.add(:location_id, "was not found") unless location
    raise ActiveRecord::RecordInvalid, check_in if check_in.errors.any?

    transaction(requires_new: true) do
      # One check-in per member at a time. Serializes retries and parallel attempts.
      member.lock!
      with_idempotency(organization.check_ins, key: idempotency_key, fingerprint:) do
        check_in.authorize_and_consume!
        check_in
      end
    end
  end

  def granted? = result == "granted"

  def authorize_and_consume!
    rights = member.entitlements.valid_at(checked_in_at).order(:ends_at, :id).lock.to_a
    in_location = rights.select { |right| right.covers_location?(location) }
    usable = in_location.select(&:usable?)
    chosen = usable.find(&:unlimited?) || usable.first

    if chosen
      self.result = "granted"
      self.entitlement = chosen
    else
      self.result = "denied"
      self.denial_reason =
        if rights.empty? then "no_entitlement"
        elsif in_location.empty? then "location_not_allowed"
        else "usage_limit_reached"
        end
    end

    transaction(requires_new: true) do
      save!
      if granted?
        chosen.increment!(:used_count)
        create_usage!(organization:, entitlement: chosen, used_at: checked_in_at)
      end
    end
  end

  def as_api
    {
      id:, member: member.as_summary_api, location_id:, result:, denial_reason:,
      entitlement_id:, checked_in_at: api_time(checked_in_at)
    }
  end
end
