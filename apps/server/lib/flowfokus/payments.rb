module Flowfokus
  # Online payment providers. Rails opens a checkout with the provider and
  # records the payment when the provider confirms it.
  #
  # Only the local test provider exists. It moves no money: the gym site shows
  # a test page, and the member chooses to pay or cancel. It is opt-in with
  # FLOWFOKUS_TEST_PAYMENTS=true, available in development and test only, and
  # production refuses to boot with it. A real provider needs its own class,
  # credentials, and a signed webhook that calls Checkout#complete!.
  module Payments
    class NotConfigured < StandardError
      def initialize(msg = "Online payment is not available at this gym yet. Book and pay at the front desk.") = super
    end
    class ProductionError < StandardError; end

    ENABLE_VARIABLE = "FLOWFOKUS_TEST_PAYMENTS".freeze
    ALLOWED_ENVIRONMENTS = %w[development test].freeze

    class TestProvider
      NAME = "test".freeze

      def name = NAME
      def new_reference = "test_#{SecureRandom.hex(12)}"
      # The gym site shows its own test page, so there is no external address.
      def payment_url(_checkout) = nil
    end

    module_function

    def test_requested?(env: ENV) = env[ENABLE_VARIABLE].to_s.strip.downcase == "true"

    # Raises when the test provider is requested outside development and test.
    def verify_environment!(env: ENV, rails_env: Rails.env)
      return unless test_requested?(env:)
      return if ALLOWED_ENVIRONMENTS.include?(rails_env.to_s)

      raise ProductionError, "#{ENABLE_VARIABLE}=true is not allowed in #{rails_env}. Test payments are local-only."
    end

    # The provider for new checkouts, or nil when online payment is off.
    def provider(env: ENV, rails_env: Rails.env)
      return nil unless test_requested?(env:)

      verify_environment!(env:, rails_env:)
      TestProvider.new
    end

    def provider!(**) = provider(**) || raise(NotConfigured)
    def enabled?(**) = !provider(**).nil?
    def test_provider?(name) = name == TestProvider::NAME
  end
end
