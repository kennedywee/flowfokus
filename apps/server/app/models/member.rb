# A customer of one organization. Staff can create a member without a login.
class Member < ApplicationRecord
  include TenantOwned

  belongs_to :user, optional: true
  has_one :membership, dependent: :restrict_with_exception
  has_many :sales, dependent: :restrict_with_exception
  has_many :entitlements, dependent: :restrict_with_exception
  has_many :check_ins, dependent: :restrict_with_exception
  has_many :link_codes, class_name: "MemberLinkCode", dependent: :restrict_with_exception
  has_many :bookings, dependent: :restrict_with_exception
  # Bookings this member's rights paid for, including spots for other people.
  has_many :held_bookings, class_name: "Booking", foreign_key: :holder_member_id, inverse_of: :holder_member, dependent: :restrict_with_exception
  has_many :checkouts, dependent: :restrict_with_exception

  normalizes :name, with: ->(name) { name.squish }
  normalizes :email, with: ->(email) { email.strip.downcase }

  validates :name, presence: true, length: { maximum: 200 }
  validates :email, presence: true, length: { maximum: 320 },
    format: { with: /\A[^@\s]+@[^@\s]+\.[^@\s]+\z/, message: "is not a valid email address" }
  validates :email, uniqueness: { scope: :organization_id, case_sensitive: false, message: "is already used by another member" }

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }
  scope :matching, ->(query) {
    pattern = "%#{sanitize_sql_like(query.to_s.strip.downcase)}%"
    where("lower(name) LIKE :pattern OR lower(email) LIKE :pattern", pattern:)
  }

  def current_period(at: Time.current) = membership&.periods&.covering(at)&.first

  # The line item behind the latest delivered period. Renewals copy its terms.
  def agreed_line_item
    membership&.periods&.live&.reorder(ends_at: :desc)&.first&.fulfillment&.sale_line_item
  end

  # What a renewal would sell, and when its period would start if delivered now.
  def renewal_terms(at: Time.current)
    line = agreed_line_item
    return nil unless line

    {
      product_name: line.product_name, price_label: line.price_label, amount_minor: line.total_minor,
      currency: line.currency, duration_days: line.terms.fetch("duration_days"),
      starts_at: api_time(membership.next_start(at))
    }
  end

  # Rights this member could use to book a spot in the occurrence now.
  def rights_for(occurrence)
    entitlements.program_access.live.where("ends_at > ?", occurrence.starts_at).order(:ends_at, :id)
      .select { _1.covers_occurrence?(occurrence) && _1.usable? }
  end

  # Bookings for times that have not ended, then the most recent past ones.
  # Includes spots this member booked for other people, and spots others booked for them.
  def recent_bookings(at: Time.current, past: 10)
    scope = Booking.where(organization_id:).where("bookings.member_id = :id OR bookings.holder_member_id = :id", id:)
      .includes(:entitlement, :usage, :member, :holder_member, occurrence: { program: :location })
    upcoming = scope.live.where.not(confirmed_at: nil).joins(:occurrence).where("occurrences.ends_at > ?", at).order("occurrences.starts_at")
    earlier = scope.where.not(confirmed_at: nil).joins(:occurrence)
      .where("occurrences.ends_at <= ? OR bookings.cancelled_at IS NOT NULL", at).order("occurrences.starts_at DESC").limit(past)
    (upcoming.to_a + earlier.to_a).uniq
  end

  def as_summary_api = { id:, name:, email: }
  def as_api = { id:, name:, email:, created_at: api_time(created_at) }

  # Removes the link to a sign-in. The member record and its history stay.
  def unlink!
    transaction do
      lock!
      link_codes.open.update_all(expires_at: Time.current, updated_at: Time.current)
      update!(user: nil)
    end
  end

  # The member's own view: membership, rights, visits, and purchases.
  def as_account_api(at: Time.current)
    as_detail_api(at:).except(:renewal, :linked_email).merge(
      check_ins: check_ins.newest_first.limit(20).map { |check_in| check_in.as_member_api },
      sales: sales.open.newest_first.includes(:line_item).limit(20).map(&:as_member_api),
      bookings: recent_bookings(at:).map { _1.as_member_api(at:) }
    )
  end

  def as_detail_api(at: Time.current)
    as_api.merge(
      linked_email: user&.email,
      membership: membership&.as_api,
      current_period: current_period(at:)&.as_api,
      renewal: renewal_terms(at:),
      entitlements: entitlements.live.where("ends_at > ?", at).order(:starts_at, :created_at).map { |right| right.as_api(at:) },
      bookings: recent_bookings(at:).map { _1.as_api(at:) }
    )
  end
end
