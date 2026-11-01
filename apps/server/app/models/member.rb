# A customer of one organization. Staff can create a member without a login.
class Member < ApplicationRecord
  include TenantOwned

  belongs_to :user, optional: true
  has_one :membership, dependent: :restrict_with_exception
  has_many :sales, dependent: :restrict_with_exception
  has_many :entitlements, dependent: :restrict_with_exception
  has_many :check_ins, dependent: :restrict_with_exception

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
    membership&.periods&.reorder(ends_at: :desc)&.first&.fulfillment&.sale_line_item
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

  def as_summary_api = { id:, name:, email: }
  def as_api = { id:, name:, email:, created_at: api_time(created_at) }

  def as_detail_api(at: Time.current)
    as_api.merge(
      membership: membership&.as_api,
      current_period: current_period(at:)&.as_api,
      renewal: renewal_terms(at:),
      entitlements: entitlements.where("ends_at > ?", at).order(:starts_at, :created_at).map { |right| right.as_api(at:) }
    )
  end
end
