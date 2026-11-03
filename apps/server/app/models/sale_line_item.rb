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
      terms: {
        "kind" => product.kind, "duration_days" => price.duration_days,
        "benefits" => product.benefits.map { |b| b.terms.stringify_keys }
      }
    }
  end

  # The same price, amounts, and terms, for a renewal sale.
  def renewal_snapshot
    attributes.slice(*%w[organization_id price_id product_id product_name price_label quantity
      unit_amount_minor total_minor currency terms]).symbolize_keys
  end

  # Sales made before passes and tickets existed are memberships.
  def kind = terms.fetch("kind", "membership")
  def ticket? = kind == "ticket"
  def membership? = kind == "membership"
  def duration = terms.fetch("duration_days").days
  def benefit_terms = terms.fetch("benefits")

  def as_api
    {
      id:, price_id:, product_id:, product_name:, price_label:, quantity:,
      unit_amount_minor:, total_minor:, currency:,
      terms: { kind:, duration_days: terms["duration_days"], benefits: benefit_terms.map { _1.symbolize_keys.reverse_merge(program_ids: [], program_kind: nil) } }
    }
  end

  private
    def terms_shape
      return errors.add(:terms, "must include kind, duration_days, and benefits") unless terms.is_a?(Hash)

      duration = terms["duration_days"]
      duration_ok = ticket? ? duration.nil? : (duration.is_a?(Integer) && duration.positive?)
      unless Product::KINDS.include?(kind) && duration_ok && terms["benefits"].is_a?(Array)
        errors.add(:terms, "must include kind, duration_days, and benefits")
      end
    end
end
