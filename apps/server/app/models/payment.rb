# Money received toward a sale. Staff record cash and bank transfers; Flowfokus
# does not move that money. Online payments come from a payment provider when
# a checkout is paid. Payments never change after they are recorded.
class Payment < ApplicationRecord
  include TenantOwned
  include Idempotent

  STAFF_METHODS = %w[cash bank_transfer].freeze
  METHODS = (STAFF_METHODS + %w[online]).freeze

  class Overpayment < StandardError; end

  belongs_to :sale
  belongs_to :recorded_by_user, class_name: "User", optional: true
  has_many :refunds, dependent: :restrict_with_exception
  same_organization_as :sale

  validates :amount_minor, numericality: { only_integer: true, greater_than: 0 }
  validates :payment_method, inclusion: { in: STAFF_METHODS, message: "must be cash or bank_transfer" }, if: :recorded_by_user
  validates :payment_method, inclusion: { in: %w[online] }, unless: :recorded_by_user
  validates :provider, presence: true, unless: :recorded_by_user
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
        raise Sale::Voided if sale.voided?

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

  # The provider's confirmed payment for a checkout. Call inside the checkout's transaction.
  def self.record_online!(sale:, amount_minor:, provider:, reference:, at:)
    sale.lock!
    raise Overpayment, "Payment of #{amount_minor} exceeds the balance of #{sale.balance_minor}." if amount_minor > sale.balance_minor

    payment = sale.payments.create!(
      organization: sale.organization, amount_minor:, payment_method: "online", provider:, reference:,
      currency: sale.currency, received_at: at,
      idempotency_key: "#{provider}-#{reference}", request_fingerprint: Idempotent.fingerprint(provider:, reference:)
    )
    sale.update!(paid_minor: sale.paid_minor + amount_minor)
    payment
  end

  def refunded_minor = refunds.sum(&:amount_minor)
  def refundable_minor = amount_minor - refunded_minor

  def as_api
    { id:, amount_minor:, currency:, method: payment_method, provider:, reference:, received_at: api_time(received_at), refunded_minor: }
  end
end
