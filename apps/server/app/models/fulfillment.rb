# Delivers one line item's purchased terms. One fulfillment per line item; a
# retry returns the existing fulfillment and creates nothing.
#
# - Membership: a period on the member's membership, a grant, and its rights.
# - Pass: a grant and rights valid from the purchase for the purchased days.
# - Ticket: a grant and a one-use right for the sale's occurrence, and the
#   booking that uses it. The occurrence must still have a spot.
#
# Online delivery has no staff actor.
class Fulfillment < ApplicationRecord
  include TenantOwned

  class SaleNotPaid < StandardError; end
  class NotDelivered < StandardError
    def initialize(msg = "This sale has not been fulfilled, so there is no access to revoke.") = super
  end

  validates :early_reason, length: { maximum: 500 }

  belongs_to :sale_line_item
  belongs_to :member
  belongs_to :membership, optional: true
  belongs_to :fulfilled_by_user, class_name: "User", optional: true
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

      attributes = {
        organization: sale.organization, sale_line_item: line_item, member: sale.member,
        fulfilled_by_user: actor, fulfilled_at: at,
        early_reason: (early_reason unless sale.paid_in_full?), unpaid_minor: sale.balance_minor
      }

      fulfillment =
        if line_item.membership? then deliver_membership!(sale, line_item, attributes, at:)
        elsif line_item.ticket? then deliver_ticket!(sale, attributes, at:)
        else deliver_pass!(sale, line_item, attributes, at:)
        end
      [ fulfillment, true ]
    end
  end

  def self.deliver_membership!(sale, line_item, attributes, at:)
    membership = Membership.lock_for!(sale.member)
    starts_at = membership.next_start(sale.purchased_at)
    fulfillment = create!(**attributes, membership:)
    period = fulfillment.create_membership_period!(
      organization: sale.organization, membership:, starts_at:, ends_at: starts_at + line_item.duration
    )
    BenefitGrant.issue!(fulfillment:, period:, at:, starts_at: period.starts_at, ends_at: period.ends_at)
    fulfillment
  end

  def self.deliver_pass!(sale, line_item, attributes, at:)
    fulfillment = create!(**attributes)
    BenefitGrant.issue!(fulfillment:, at:, starts_at: sale.purchased_at, ends_at: sale.purchased_at + line_item.duration)
    fulfillment
  end

  # Takes the spots first, so a full, cancelled, or ended time delivers
  # nothing. Desk staff may still sell spots after the start. An online
  # checkout's held bookings already hold their spots.
  #
  # One right covers every spot of the line: its uses equal the quantity, and
  # the buyer holds it. Each attendee gets a booking that uses one.
  def self.deliver_ticket!(sale, attributes, at:)
    occurrence = sale.occurrence
    occurrence.lock!
    raise Occurrence::Unavailable, "This time was cancelled." if occurrence.cancelled?
    raise Occurrence::Unavailable, "This time has already ended." if occurrence.ended?(at)

    held = (sale.checkout&.bookings || []).select { _1.held? && !_1.cancelled? }
    attendees = AttendeeList.booking_attributes(sale.organization, sale.attendees.presence || [ { "member_id" => sale.member_id } ])
    if held.empty?
      Booking.ensure_attendees_free!(occurrence, attendees, holder: sale.member, at:)
      left = occurrence.capacity - occurrence.bookings.filling(at).count
      raise Occurrence::Full if left <= 0
      raise Occurrence::Full, "Only #{left} #{left == 1 ? 'spot is' : 'spots are'} left at this time." if attendees.size > left
    end

    fulfillment = create!(**attributes)
    grant = BenefitGrant.issue!(fulfillment:, at:, starts_at: [ sale.purchased_at, occurrence.starts_at ].min,
      ends_at: occurrence.ends_at, occurrence:)
    entitlement = grant.entitlements.find(&:program_access?)
    if held.any?
      held.each { _1.confirm!(entitlement:, sale:, at:) }
    else
      attendees.each do |attendee|
        Booking.create!(
          organization: sale.organization, holder_member: sale.member, occurrence:, entitlement:, sale:,
          booked_by_user: attributes[:fulfilled_by_user], confirmed_at: at, **attendee
        ).use_entitlement!(at:)
      end
    end
    fulfillment
  end

  def revoked? = revoked_at.present?

  # Ends the access from this delivery only: its period and its entitlements.
  # Other periods, the sale, and its payments stay as they are. Usage already
  # recorded stays. Returns [fulfillment, changed].
  def revoke!(actor:, reason:, at: Time.current)
    transaction do
      Membership.lock_for!(member) if membership
      lock!
      next [ self, false ] if revoked?

      update!(revoked_at: at, revoked_by_user: actor, revoke_reason: reason.to_s.strip.presence)
      membership_period&.update!(revoked_at: at)
      rights = benefit_grant.entitlements
      rights.update_all(revoked_at: at, updated_at: at)
      # Spots booked with these rights for times that have not started are freed.
      Booking.live.where(entitlement: rights).joins(:occurrence).where("occurrences.starts_at > ?", at).order(:id).each do |booking|
        booking.cancel!(actor:, reason: "Access revoked: #{revoke_reason}", at:, return_use: false, force: true)
      end
      [ self, true ]
    end
  end

  def as_api
    {
      id:, sale_line_item_id:, membership_id:,
      membership_period: membership_period&.as_api,
      fulfilled_at: api_time(fulfilled_at),
      early: unpaid_minor.positive?, early_reason:, unpaid_minor:,
      revoked_at: api_time(revoked_at), revoke_reason:
    }
  end
end
