# Every error uses { error: { code, message, details? } }.
module ErrorResponses
  extend ActiveSupport::Concern

  class RequestError < StandardError
    attr_reader :status, :code, :details

    def initialize(status, code, message, details: nil)
      super(message)
      @status, @code, @details = status, code, details
    end
  end

  included do
    rescue_from StandardError, with: :render_internal_error
    rescue_from ActiveRecord::ConnectionNotEstablished, ActiveRecord::DatabaseConnectionError do
      render_error :service_unavailable, "database_unavailable", "The database is not available."
    end
    rescue_from RequestError do |error|
      render_error error.status, error.code, error.message, details: error.details
    end
    rescue_from ActionDispatch::Http::Parameters::ParseError do
      render_error :bad_request, "bad_request", "The request body is not valid JSON."
    end
    rescue_from ActionController::ParameterMissing, ActionController::BadRequest do |error|
      render_error :bad_request, "bad_request", error.message
    end
    rescue_from ActiveRecord::RecordNotFound do
      render_error :not_found, "not_found", "The record was not found."
    end
    rescue_from ActiveRecord::RecordInvalid do |error|
      render_validation_error error.record
    end
    rescue_from Idempotent::KeyReused do |error|
      render_error :conflict, "idempotency_key_reused", error.message
    end
    rescue_from Sale::PriceUnavailable do |error|
      render_error :unprocessable_content, "price_unavailable", error.message
    end
    rescue_from Payment::Overpayment do |error|
      render_error :unprocessable_content, "overpayment", error.message
    end
    rescue_from Fulfillment::SaleNotPaid do |error|
      render_error :unprocessable_content, "sale_not_paid", error.message
    end
  end

  private
    def render_error(status, code, message, details: nil)
      error = { code:, message: }
      error[:details] = details if details.present?
      render json: { error: }, status:
    end

    def render_validation_error(record)
      details = record.errors.group_by_attribute.to_h do |attribute, errors|
        [ attribute.to_s.sub(/\Apayment_method\z/, "method"), errors.map(&:message) ]
      end
      render_error :unprocessable_content, "validation_failed", "#{record.class.model_name.human} is invalid.", details:
    end

    def render_internal_error(error)
      raise error if Rails.env.local? && !Rails.env.test?

      Rails.logger.error("#{error.class}: #{error.message}\n#{error.backtrace&.first(10)&.join("\n")}")
      render json: { error: { code: "internal_error", message: "Something went wrong." } }, status: :internal_server_error
    end
end
