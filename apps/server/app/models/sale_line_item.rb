# What the customer bought, frozen at purchase. A database trigger rejects updates.
class SaleLineItem < ApplicationRecord
  include TenantOwned

  belongs_to :sale
  belongs_to :price
  belongs_to :product
  has_one :fulfillment, dependent: :restrict_with_exception
  same_organization_as :sale, :price, :product

  validates :quantity, inclusion: { in: [ 1 ], message: "must be 1" }
  validates :product_name, :price_label, presence: true
  validate :terms_shape

  before_update { raise ActiveRecord::ReadOnlyRecord, "Sale line items are immutable" }

  def self.snapshot(price)
    product = price.product
    {
      organization: price.organization,
      price:,
      product:,
      product_name: product.name,
      price_label: price.label,
      quantity: 1,
      unit_amount_minor: price.amount_minor,
      total_minor: price.amount_minor,
      currency: price.currency,
      terms: { "duration_days" => price.duration_days, "benefits" => product.benefits.map { |b| b.terms.stringify_keys } }
    }
  end

  def duration = terms.fetch("duration_days").days
  def benefit_terms = terms.fetch("benefits")

  def as_api
    {
      id:, price_id:, product_id:, product_name:, price_label:, quantity:,
      unit_amount_minor:, total_minor:, currency:,
      terms: { duration_days: terms["duration_days"], benefits: benefit_terms.map(&:symbolize_keys) }
    }
  end

  private
    def terms_shape
      unless terms.is_a?(Hash) && terms["duration_days"].is_a?(Integer) && terms["duration_days"].positive? && terms["benefits"].is_a?(Array)
        errors.add(:terms, "must include duration_days and benefits")
      end
    end
end
