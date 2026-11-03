# One dated instance of a program: starts_at <= time < ends_at, with its own
# capacity. Live bookings fill it: confirmed ones, and held ones whose hold has
# not ended.
class Occurrence < ApplicationRecord
  include TenantOwned

  class Unavailable < StandardError; end
  class Full < StandardError
    def initialize(msg = "This time is full.") = super
  end

  belongs_to :program
  has_many :bookings, dependent: :restrict_with_exception
  same_organization_as :program

  validates :starts_at, :ends_at, presence: true
  validates :capacity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 10_000 }
  validates :cancel_reason, length: { maximum: 500 }
  validates :cancel_reason, presence: true, if: :cancelled_at
  validate { errors.add(:ends_at, "must be after starts_at") if starts_at && ends_at && ends_at <= starts_at }

  scope :live, -> { where(cancelled_at: nil) }
  scope :upcoming, ->(at = Time.current) { where("ends_at > ?", at) }
  scope :chronological, -> { order(:starts_at, :id) }

  def cancelled? = cancelled_at.present?
  def started?(at = Time.current) = starts_at <= at
  def ended?(at = Time.current) = ends_at <= at

  # Live booking counts for many occurrences in one query: { occurrence_id => count }.
  def self.taken_counts(ids, at = Time.current)
    Booking.filling(at).where(occurrence_id: ids).group(:occurrence_id).count
  end

  def spots_taken(at = Time.current) = bookings.filling(at).count
  def spots_left(at = Time.current, taken: spots_taken(at)) = [ capacity - taken, 0 ].max
  def bookable?(at = Time.current, taken: spots_taken(at)) = !cancelled? && !started?(at) && spots_left(at, taken:).positive?

  # Call with the occurrence locked. Raises unless a new booking may take a spot.
  def ensure_bookable!(at: Time.current, except: nil)
    raise Unavailable, "This time was cancelled." if cancelled?
    raise Unavailable, "This time has already started." if started?(at)

    taken = bookings.filling(at)
    taken = taken.where.not(id: except.id) if except
    raise Full if taken.count >= capacity
  end

  # Cancels this time and every live booking in it. Each booking returns its use.
  # Returns [occurrence, changed].
  def cancel!(actor:, reason:, at: Time.current)
    reason = reason.to_s.strip.presence
    transaction do
      lock!
      next [ self, false ] if cancelled?

      update!(cancelled_at: at, cancel_reason: reason)
      bookings.live.order(:id).lock.each do |booking|
        booking.cancel!(actor:, reason: "The time was cancelled: #{reason}", at:, return_use: true, by_member: false, force: true)
      end
      [ self, true ]
    end
  end

  # How a member could take a spot: rights they hold, ticket prices, and any
  # live booking they already have here.
  def options_for(member, at: Time.current)
    Booking.release_expired_holds!(member:, occurrence: self, at:) if bookings.live.where(member:).where(confirmed_at: nil).exists?
    current = bookings.live.includes(:entitlement, :usage).find_by(member:)
    {
      rights: member.rights_for(self).map { _1.as_api(at:) },
      ticket_prices: program.ticket_prices.map(&:as_api),
      booking: current&.as_member_api(at:)
    }
  end

  # Staff roster: the time, its program, and every booking, newest last.
  def as_roster_api(at: Time.current)
    as_api(at:).merge(
      program: program.as_api.merge(location_name: program.location.name),
      bookings: bookings.includes(:member, :entitlement, :usage).order(:created_at, :id).map { _1.as_api(at:) }
    )
  end

  def as_api(at: Time.current, taken: spots_taken(at))
    {
      id:, program_id:, starts_at: api_time(starts_at), ends_at: api_time(ends_at), capacity:,
      spots_taken: taken, spots_left: spots_left(at, taken:), bookable: bookable?(at, taken:),
      cancelled_at: api_time(cancelled_at), cancel_reason:
    }
  end

  def as_public_api(at: Time.current, taken: spots_taken(at))
    {
      id:, program_id:, starts_at: api_time(starts_at), ends_at: api_time(ends_at), capacity:,
      spots_left: spots_left(at, taken:), bookable: bookable?(at, taken:), cancelled: cancelled?
    }
  end
end
