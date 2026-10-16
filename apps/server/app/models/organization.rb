class Organization < ApplicationRecord
  RESERVED_SLUGS = %w[
    admin api app auth billing blog dashboard docs help login logout mail portal
    signin signout signup sso static status support www
  ].freeze
  SLUG_FORMAT = /\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/

  has_many :organization_memberships, dependent: :restrict_with_exception
  has_many :locations, -> { order(:name) }, dependent: :restrict_with_exception
  has_many :members, dependent: :restrict_with_exception
  has_many :products, -> { order(:position, :name) }, dependent: :restrict_with_exception
  has_many :prices, dependent: :restrict_with_exception
  has_many :sales, dependent: :restrict_with_exception
  has_many :payments, dependent: :restrict_with_exception
  has_many :memberships, dependent: :restrict_with_exception
  has_many :membership_periods, dependent: :restrict_with_exception
  has_many :entitlements, dependent: :restrict_with_exception
  has_many :check_ins, dependent: :restrict_with_exception

  scope :published, -> { where(published: true) }

  normalizes :slug, with: ->(slug) { slug.strip.downcase }
  validates :name, presence: true
  validates :slug, presence: true, uniqueness: true, format: { with: SLUG_FORMAT },
    exclusion: { in: RESERVED_SLUGS, message: "is reserved" }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validate :timezone_known

  def self.find_by_slug(slug)
    slug = slug.to_s.strip.downcase
    return nil unless SLUG_FORMAT.match?(slug)

    find_by(slug:)
  end

  def time_zone = ActiveSupport::TimeZone[timezone]

  def overview(at: Time.current)
    day_start = at.in_time_zone(time_zone).beginning_of_day
    today = check_ins.where(checked_in_at: day_start..at).group(:result).count

    {
      member_count: members.count,
      active_membership_count: membership_periods.covering(at).distinct.count(:membership_id),
      unpaid_sale_count: sales.where("paid_minor < total_minor").count,
      awaiting_fulfillment_count: sales.where("paid_minor = total_minor").where.missing(:fulfillment).count,
      check_ins_today: { granted: today.fetch("granted", 0), denied: today.fetch("denied", 0) }
    }
  end

  def as_public_api
    {
      slug:, name:, timezone:, currency:,
      locations: locations.map { |location| { name: location.name, address: location.address } }
    }
  end

  def as_staff_api(user:, permissions:, demo:)
    {
      id:, slug:, name:, timezone:, currency:,
      locations: locations.map(&:as_api),
      actor: { name: user.name, email: user.email, demo: demo, permissions: permissions }
    }
  end

  private
    def timezone_known
      errors.add(:timezone, "is not a known time zone") unless time_zone
    end
end
