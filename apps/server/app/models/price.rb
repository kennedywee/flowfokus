# Amount, currency, product, and duration never change; a change creates a new
# price. Archive a price to stop new sales. A database trigger also rejects
# changes to these columns.
class Price < ApplicationRecord
  include TenantOwned

  belongs_to :product
  has_many :sale_line_items, dependent: :restrict_with_exception
  same_organization_as :product

  attr_readonly :product_id, :amount_minor, :currency, :duration_days

  validates :label, presence: true
  validates :amount_minor, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :duration_days, numericality: { only_integer: true, greater_than: 0 }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validate :currency_matches_organization, on: :create

  def sellable? = available && archived_at.nil?

  def archive!(at: Time.current) = update!(available: false, archived_at: at)

  def as_api
    { id:, label:, amount_minor:, currency:, duration_days:, available: sellable?, archived_at: api_time(archived_at) }
  end

  def as_public_api = { id:, label:, amount_minor:, currency:, duration_days: }

  private
    def currency_matches_organization
      return if organization.nil? || currency == organization.currency

      errors.add(:currency, "must match the organization currency")
    end
end
