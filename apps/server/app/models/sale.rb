# Groups one line item and its payments. Sprint 1 limit: one line, quantity one.
class Sale < ApplicationRecord
  include TenantOwned
  include Idempotent

  class PriceUnavailable < StandardError
    def initialize(msg = "This price is archived or not available for new sales.") = super
  end

  belongs_to :member
  belongs_to :location
  belongs_to :created_by_user, class_name: "User"
  has_one :line_item, class_name: "SaleLineItem", dependent: :restrict_with_exception
  has_one :fulfillment, through: :line_item
  has_many :payments, -> { order(:received_at, :created_at) }, dependent: :restrict_with_exception
  same_organization_as :member, :location

  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validates :total_minor, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :paid_minor, numericality: { only_integer: true, greater_than_or_equal_to: 0, less_than_or_equal_to: :total_minor }

  scope :newest_first, -> { order(created_at: :desc, id: :desc) }
  scope :with_details, -> { includes(:member, :payments, line_item: { fulfillment: :membership_period }) }

  # Creates the sale and its snapshotted line in one transaction.
  # Returns [sale, created]. A retry with the same key returns the first sale.
  def self.record!(organization:, actor:, idempotency_key:, member_id:, price_id:, location_id:, at: Time.current)
    fingerprint = Idempotent.fingerprint(member_id:, price_id:, location_id:)

    with_idempotency(organization.sales, key: idempotency_key, fingerprint:) do
      member = organization.members.find_by(id: member_id)
      location = organization.locations.find_by(id: location_id)
      price = organization.prices.includes(product: :benefits).find_by(id: price_id)

      sale = organization.sales.new(
        member:, location:, created_by_user: actor, purchased_at: at,
        idempotency_key:, request_fingerprint: fingerprint, paid_minor: 0
      )
      sale.errors.add(:member_id, "was not found") unless member
      sale.errors.add(:location_id, "was not found") unless location
      sale.errors.add(:price_id, "was not found") unless price
      raise ActiveRecord::RecordInvalid, sale if sale.errors.any?
      raise PriceUnavailable unless price.sellable?

      sale.currency = price.currency
      sale.total_minor = price.amount_minor
      sale.build_line_item(SaleLineItem.snapshot(price))

      transaction(requires_new: true) { sale.save! }
      sale
    end
  end

  def balance_minor = total_minor - paid_minor
  def paid_in_full? = balance_minor.zero?
  def fulfilled? = fulfillment.present?

  def payment_status
    if paid_in_full? then "paid"
    elsif paid_minor.positive? then "partially_paid"
    else "unpaid"
    end
  end

  def record_payment!(**) = Payment.record!(sale: self, **)
  def fulfill!(actor:, at: Time.current) = Fulfillment.deliver!(line_item, actor:, at:)

  def as_api
    {
      id:,
      member: member.as_summary_api,
      location_id:,
      currency:,
      total_minor:,
      paid_minor:,
      balance_minor:,
      payment_status:,
      fulfilled: fulfilled?,
      purchased_at: api_time(purchased_at),
      line_item: line_item.as_api,
      payments: payments.map(&:as_api),
      fulfillment: fulfillment&.as_api
    }
  end
end
