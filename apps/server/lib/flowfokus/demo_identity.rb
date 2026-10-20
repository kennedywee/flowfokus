module Flowfokus
  # Local-only demo actor. A fixed seeded identity with fixed permissions.
  #
  # The portal server sends FLOWFOKUS_DEMO_TOKEN as its Bearer value. The token
  # maps to the constants below; a caller can never choose its own claims.
  # Demo mode is available only in development and test. Production refuses to boot.
  module DemoIdentity
    class ProductionError < StandardError; end
    class TokenError < StandardError; end

    ENABLE_VARIABLE = "FLOWFOKUS_DEMO_MODE".freeze
    TOKEN_VARIABLE = "FLOWFOKUS_DEMO_TOKEN".freeze
    ALLOWED_ENVIRONMENTS = %w[development test].freeze
    MIN_TOKEN_LENGTH = 16

    USER = {
      workos_id: "user_demo_chainsaw_owner",
      email: "demo.owner@flowfokus.test",
      first_name: "Demo",
      last_name: "Owner"
    }.freeze

    ORGANIZATION_SLUG = "chainsaw".freeze
    ORGANIZATION_WORKOS_ID = "org_demo_chainsaw".freeze

    PERMISSIONS = %w[
      members:read members:create
      products:read
      purchases:read purchases:create purchases:fulfill
      payments:create
      check_ins:read check_ins:create
    ].freeze

    module_function

    def requested?(env: ENV)
      env[ENABLE_VARIABLE].to_s.strip.downcase == "true"
    end

    # Raises in any environment other than development or test.
    def verify_environment!(env: ENV, rails_env: Rails.env)
      return unless requested?(env:)

      unless ALLOWED_ENVIRONMENTS.include?(rails_env.to_s)
        raise ProductionError, "#{ENABLE_VARIABLE}=true is not allowed in #{rails_env}. Demo authentication is local-only."
      end

      token(env:)
    end

    def enabled?(env: ENV, rails_env: Rails.env)
      return false unless requested?(env:)

      verify_environment!(env:, rails_env:)
      true
    end

    def token(env: ENV)
      value = env[TOKEN_VARIABLE].to_s
      if value.length < MIN_TOKEN_LENGTH
        raise TokenError, "#{TOKEN_VARIABLE} must be at least #{MIN_TOKEN_LENGTH} characters when #{ENABLE_VARIABLE}=true."
      end
      value
    end

    # Returns claims when the token is the demo token, otherwise nil.
    def claims_for(bearer, env: ENV, rails_env: Rails.env)
      return nil unless enabled?(env:, rails_env:)
      return nil unless ActiveSupport::SecurityUtils.secure_compare(bearer.to_s, token(env:))

      IdentityClaims.new(
        user_workos_id: USER[:workos_id],
        organization_workos_id: ORGANIZATION_WORKOS_ID,
        permissions: PERMISSIONS,
        demo: true
      )
    end
  end
end
