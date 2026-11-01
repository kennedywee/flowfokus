# Money returned against one payment. It never edits the payment. Refunding
# money and revoking access are separate actions: a refund keeps the
# member's access unless staff also revoke it.
class Refund < ApplicationRecord
  include TenantOwned
  include Idempotent

  class ExceedsPayment < StandardError; end

  belongs_to :sale
  belongs_to :payment
  belongs_to :recorded_by_user, class_name: "User"
  same_organization_as :sale, :payment

  validates :amount_minor, numericality: { only_integer: true, greater_than: 0 }
  validates :reason, presence: true, length: { maximum: 500 }
  validate { errors.add(:payment_id, "was not found") if payment && payment.sale_id != sale_id }

  before_update { raise ActiveRecord::ReadOnlyRecord, "Refunds are immutable" }

  # Locks the sale, checks what is left to refund on the payment, and records
  # the refund. Returns [refund, created].
  def self.record!(sale:, actor:, idempotency_key:, payment_id:, amount_minor:, reason:, at: Time.current)
    fingerprint = Idempotent.fingerprint(sale_id: sale.id, payment_id:, amount_minor:, reason: reason.to_s.strip)

    sale.transaction(requires_new: true) do
      sale.lock!
      with_idempotency(sale.organization.refunds, key: idempotency_key, fingerprint:) do
        payment = sale.payments.find_by(id: payment_id)
        refund = sale.refunds.new(
          organization: sale.organization, payment:, recorded_by_user: actor, amount_minor:,
          currency: sale.currency, reason: reason.to_s.strip, refunded_at: at,
          idempotency_key:, request_fingerprint: fingerprint
        )
        refund.errors.add(:payment_id, "was not found") unless payment
        raise ActiveRecord::RecordInvalid, refund if refund.errors.any?

        refund.validate!
        if refund.amount_minor > payment.refundable_minor
          raise ExceedsPayment, "Refund of #{refund.amount_minor} exceeds the #{payment.refundable_minor} left to refund on this payment."
        end

        transaction(requires_new: true) do
          refund.save!
          sale.update!(refunded_minor: sale.refunded_minor + refund.amount_minor)
        end
        refund
      end
    end
  end

  def as_api
    { id:, payment_id:, amount_minor:, currency:, reason:, refunded_at: api_time(refunded_at) }
  end
end
