# An online purchase waiting for the payment provider.
#
# Opening a checkout records the chosen price and, for a ticket, holds a spot
# until the checkout expires. Nothing is sold yet. When the provider confirms
# payment, one transaction creates the sale, records the payment, delivers the
# purchase, and confirms the held spot. An abandoned checkout leaves no sale.
class Checkout < ApplicationRecord
  include TenantOwned
  include Idempotent

  HOLD = 30.minutes
  STATUSES = %w[open paid cancelled].freeze

  class Closed < StandardError; end

  belongs_to :member
  belongs_to :price
  belongs_to :occurrence, optional: true
  belongs_to :sale, optional: true
  has_one :booking, dependent: :restrict_with_exception
  same_organization_as :member, :price, :occurrence, :sale

  validates :status, inclusion: { in: STATUSES }
  validates :amount_minor, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  # Opens a checkout for the member. Returns [checkout, created]. A retry with
  # the same key returns the first checkout. A free purchase completes at once.
  def self.open!(member:, idempotency_key:, price_id:, occurrence_id: nil, at: Time.current)
    organization = member.organization
    fingerprint = Idempotent.fingerprint(member_id: member.id, price_id:, **(occurrence_id ? { occurrence_id: } : {}))

    with_idempotency(organization.checkouts, key: idempotency_key, fingerprint:) do
      price = organization.prices.includes(product: :benefits).find_by(id: price_id)
      raise ActiveRecord::RecordNotFound unless price && price.product.published?
      raise Sale::PriceUnavailable unless price.sellable?

      occurrence = Sale.ticket_occurrence!(organization, price, occurrence_id, at:)
      raise ActiveRecord::RecordNotFound if occurrence && !occurrence.program.published?

      free = price.amount_minor.zero?
      provider = free ? nil : Flowfokus::Payments.provider!
      transaction(requires_new: true) do
        checkout = organization.checkouts.create!(
          member:, price:, occurrence:, amount_minor: price.amount_minor, currency: price.currency,
          provider: provider&.name || "free", provider_reference: provider&.new_reference || "free_#{SecureRandom.hex(12)}",
          expires_at: at + HOLD, idempotency_key:, request_fingerprint: fingerprint
        )
        Booking.hold!(checkout:, at:) if occurrence
        checkout.complete!(at:) if free
        checkout
      end
    end
  end

  def expired?(at = Time.current) = status == "open" && expires_at <= at
  def paid? = status == "paid"

  def effective_status(at = Time.current) = expired?(at) ? "expired" : status

  # The provider confirmed payment of the full amount. Idempotent: a repeated
  # confirmation changes nothing. Returns [checkout, changed].
  def complete!(at: Time.current)
    transaction(requires_new: true) do
      lock!
      next [ self, false ] if paid?
      raise Closed, "This checkout was cancelled." if status == "cancelled"
      raise Closed, "This checkout expired. Start again." if expired?(at)
      if occurrence && !(booking && booking.held? && !booking.cancelled?)
        raise Occurrence::Unavailable, "The spot for this time is no longer held. Start again."
      end

      sale = Sale.record_online!(checkout: self, at:)
      if amount_minor.positive?
        Payment.record_online!(sale:, amount_minor:, provider:, reference: provider_reference, at:)
      end
      update!(status: "paid", sale:, completed_at: at)
      sale.reload.fulfill!(actor: nil, at:)
      [ self, true ]
    end
  end

  # The member left the provider's page without paying. The held spot is freed.
  # Returns [checkout, changed].
  def cancel!(at: Time.current)
    transaction do
      lock!
      next [ self, false ] if status == "cancelled"
      raise Closed, "This checkout is already paid." if paid?

      update!(status: "cancelled")
      booking&.cancel!(actor: nil, reason: "The checkout was cancelled.", at:, return_use: false, force: true)
      [ self, true ]
    end
  end

  def as_member_api(at: Time.current)
    product = price.product
    {
      id:, status: effective_status(at), provider:, payment_url: payment_url,
      amount_minor:, currency:, expires_at: api_time(expires_at), completed_at: api_time(completed_at),
      product_name: product.name, product_kind: product.kind, price_label: price.label,
      occurrence: occurrence && {
        id: occurrence.id, program_name: occurrence.program.name,
        starts_at: api_time(occurrence.starts_at), ends_at: api_time(occurrence.ends_at)
      },
      sale_id:, booking_id: booking&.id
    }
  end

  private
    def payment_url
      return nil unless status == "open"

      Flowfokus::Payments.provider&.then { _1.name == provider ? _1.payment_url(self) : nil }
    end
end
