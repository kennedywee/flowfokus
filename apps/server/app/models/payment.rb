# Money staff received toward a sale. Cash or bank transfer only; Hydraflow
# does not move money. Payments never change after they are recorded.
class Payment < ApplicationRecord
  include TenantOwned
  include Idempotent

  METHODS = %w[cash bank_transfer].freeze

  class Overpayment < StandardError; end

  belongs_to :sale
  belongs_to :recorded_by_user, class_name: "User"
  same_organization_as :sale

  validates :amount_minor, numericality: { only_integer: true, greater_than: 0 }
  validates :payment_method, inclusion: { in: METHODS, message: "must be cash or bank_transfer" }
  validates :reference, length: { maximum: 200 }

  before_update { raise ActiveRecord::ReadOnlyRecord, "Payments are immutable" }

  # Locks the sale, rejects overpayment, and records the payment.
  # Returns [payment, created]. A retry with the same key records nothing new.
  def self.record!(sale:, actor:, idempotency_key:, amount_minor:, method:, reference: nil, at: Time.current)
    fingerprint = Idempotent.fingerprint(sale_id: sale.id, amount_minor:, method:, reference: reference.presence)

    sale.transaction(requires_new: true) do
      sale.lock!
      with_idempotency(sale.organization.payments, key: idempotency_key, fingerprint:) do
        payment = sale.payments.new(
          organization: sale.organization, recorded_by_user: actor, amount_minor:, payment_method: method,
          reference: reference.presence, currency: sale.currency, received_at: at,
          idempotency_key:, request_fingerprint: fingerprint
        )
        payment.validate!
        if payment.amount_minor > sale.balance_minor
          raise Overpayment, "Payment of #{payment.amount_minor} exceeds the balance of #{sale.balance_minor}."
        end

        transaction(requires_new: true) do
          payment.save!
          sale.update!(paid_minor: sale.paid_minor + payment.amount_minor)
        end
        payment
      end
    end
  end

  def as_api = { id:, amount_minor:, currency:, method: payment_method, reference:, received_at: api_time(received_at) }
end
