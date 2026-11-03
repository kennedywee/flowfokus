# One member's spot in one occurrence.
#
# A confirmed booking uses one entitlement: the use is recorded when the spot
# is taken. Cancelling can return the use. A held booking waits for an online
# checkout and stops counting when its hold ends. One live booking per member
# and occurrence; the database enforces it.
class Booking < ApplicationRecord
  include TenantOwned

  class NotAllowed < StandardError; end

  belongs_to :member
  belongs_to :occurrence
  belongs_to :entitlement, optional: true
  belongs_to :checkout, optional: true
  belongs_to :sale, optional: true
  belongs_to :booked_by_user, class_name: "User", optional: true
  belongs_to :cancelled_by_user, class_name: "User", optional: true
  belongs_to :attended_by_user, class_name: "User", optional: true
  has_one :usage, class_name: "EntitlementUsage", dependent: :restrict_with_exception
  same_organization_as :member, :occurrence, :entitlement, :checkout, :sale

  validates :cancel_reason, length: { maximum: 500 }

  scope :live, -> { where(cancelled_at: nil) }
  # Bookings that take a spot at `at`.
  scope :filling, ->(at = Time.current) { live.where("bookings.confirmed_at IS NOT NULL OR bookings.held_until > ?", at) }
  scope :chronological, -> { joins(:occurrence).order("occurrences.starts_at", :id) }

  # Books a spot with a right the member already holds. Returns [booking, created].
  # Booking the same time again with the same right returns the first booking.
  def self.book!(member:, occurrence_id:, entitlement_id:, actor: nil, at: Time.current)
    organization = member.organization
    occurrence = organization.occurrences.find_by(id: occurrence_id) || raise(ActiveRecord::RecordNotFound)

    transaction do
      occurrence.lock!
      existing = release_expired_holds!(member:, occurrence:, at:)
      if existing
        raise NotAllowed, "You already have a spot at this time." unless existing.entitlement_id == entitlement_id && existing.confirmed?

        next [ existing, false ]
      end

      entitlement = member.entitlements.lock.find_by(id: entitlement_id) ||
        raise(NotAllowed, "Choose one of your passes or memberships.")
      ensure_entitlement_covers!(entitlement, occurrence)
      occurrence.ensure_bookable!(at:)

      booking = create!(organization:, member:, occurrence:, entitlement:, booked_by_user: actor, confirmed_at: at)
      booking.use_entitlement!(at:)
      [ booking, true ]
    end
  end

  # Holds a spot while an online checkout waits for payment.
  def self.hold!(checkout:, at: Time.current)
    occurrence = checkout.occurrence
    occurrence.lock!
    if release_expired_holds!(member: checkout.member, occurrence:, at:)
      raise NotAllowed, "You already have a spot at this time."
    end

    occurrence.ensure_bookable!(at:)
    create!(organization: checkout.organization, member: checkout.member, occurrence:, checkout:, held_until: checkout.expires_at)
  end

  # Ends holds that have run out, so the member can book again. Returns the
  # member's remaining live booking for the occurrence, if any.
  def self.release_expired_holds!(member:, occurrence:, at:)
    live = occurrence.bookings.live.where(member:).lock.first
    return nil unless live
    return live unless live.held? && live.held_until <= at

    live.update!(cancelled_at: at, cancel_reason: "The checkout expired before payment.")
    nil
  end

  def self.ensure_entitlement_covers!(entitlement, occurrence)
    raise NotAllowed, "This pass or membership does not include #{occurrence.program.name} at this time." unless entitlement.covers_occurrence?(occurrence)
    raise NotAllowed, "This pass has no uses left." unless entitlement.usable?
  end

  def confirmed? = confirmed_at.present?
  def cancelled? = cancelled_at.present?
  def attended? = attended_at.present?
  def held? = confirmed_at.nil? && held_until.present?
  def from_ticket? = sale_id.present?

  def status(at = Time.current)
    if cancelled? then "cancelled"
    elsif attended? then "attended"
    elsif confirmed? then "confirmed"
    elsif held_until > at then "held"
    else "expired"
    end
  end

  # Records the use of the booking's entitlement. Call inside the booking's transaction.
  def use_entitlement!(at:)
    entitlement.increment!(:used_count)
    create_usage!(organization:, entitlement:, used_at: at)
  end

  # Confirms a held or new spot with the ticket entitlement just delivered.
  def confirm!(entitlement:, sale:, at:)
    update!(entitlement:, sale:, confirmed_at: at, held_until: nil)
    use_entitlement!(at:)
  end

  # Cancels the spot. Members may cancel only their own pass or membership
  # bookings before the start. Staff may cancel any live booking. A returned use
  # stays recorded with its return time. Returns [booking, changed].
  def cancel!(actor:, reason:, at: Time.current, return_use: true, by_member: false, force: false)
    reason = reason.to_s.strip.presence
    transaction do
      lock!
      next [ self, false ] if cancelled?

      unless force
        raise NotAllowed, "Give a reason." unless reason
        if by_member
          raise NotAllowed, "This time has already started. Ask the front desk." if occurrence.started?(at)
          raise NotAllowed, "Ticket bookings are changed at the front desk." if from_ticket?
        end
        raise NotAllowed, "This member already attended." if attended?
      end

      update!(cancelled_at: at, cancel_reason: reason, cancelled_by_user: actor)
      return_use!(at:) if return_use && confirmed? && !attended?
      [ self, true ]
    end
  end

  # Marks the member as present. Returns [booking, changed].
  def attend!(actor:, at: Time.current)
    transaction do
      lock!
      next [ self, false ] if attended?
      raise NotAllowed, "Only a confirmed booking can be marked present." unless confirmed? && !cancelled?
      raise NotAllowed, "This time was cancelled." if occurrence.cancelled?

      update!(attended_at: at, attended_by_user: actor)
      [ self, true ]
    end
  end

  def as_api(at: Time.current)
    {
      id:, status: status(at), member: member.as_summary_api, occurrence_id:,
      program: { id: occurrence.program_id, name: occurrence.program.name, kind: occurrence.program.kind },
      starts_at: api_time(occurrence.starts_at), ends_at: api_time(occurrence.ends_at),
      entitlement: entitlement && { id: entitlement.id, name: entitlement.name },
      source: from_ticket? || checkout_id ? "ticket" : "entitlement", sale_id:,
      held_until: api_time(held_until), confirmed_at: api_time(confirmed_at),
      cancelled_at: api_time(cancelled_at), cancel_reason:, attended_at: api_time(attended_at),
      use_returned: usage&.returned_at.present? || false
    }
  end

  def as_member_api(at: Time.current)
    as_api(at:).except(:member).merge(
      location_name: occurrence.program.location.name,
      cancellable: confirmed? && !cancelled? && !attended? && !from_ticket? && !occurrence.started?(at)
    )
  end

  private
    def return_use!(at:)
      return unless usage && usage.returned_at.nil?

      usage.update!(returned_at: at)
      entitlement.lock!
      entitlement.decrement!(:used_count)
    end
end
