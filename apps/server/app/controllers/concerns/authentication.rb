# Bearer token authentication for /staff/* and /member/*.
#
# Order of checks:
# 1. No Bearer token: 401 unauthenticated.
# 2. Demo mode (development/test only) and the demo token: fixed demo claims.
# 3. WorkOS configured: verify the token against the WorkOS JWKS.
#    A bad, expired, or foreign token gets 401 invalid_token. Missing or
#    unsafe settings, an unreachable JWKS, or an unverified production setup
#    get 503 auth_unavailable.
# 4. Demo mode with another token: 401 invalid_token.
# 5. Nothing configured: 503 auth_not_configured.
#
# Rails never sets cookies and never reads the host.
module Authentication
  extend ActiveSupport::Concern

  private
    def bearer_token
      scheme, token = request.authorization.to_s.split(" ", 2)
      token.to_s.strip if scheme&.casecmp?("Bearer") && token.present?
    end

    def verified_claims!
      token = bearer_token
      fail_auth! :unauthorized, "unauthenticated", "Send Authorization: Bearer <token>." unless token

      if (claims = Flowfokus::DemoIdentity.claims_for(token))
        claims
      elsif Flowfokus::WorkosTokens.configured?
        Flowfokus::WorkosTokens.verify!(token)
      elsif Flowfokus::DemoIdentity.enabled?
        fail_auth! :unauthorized, "invalid_token", "The Bearer token is not valid."
      else
        fail_auth! :service_unavailable, "auth_not_configured",
          "Authentication is not configured. Set up WorkOS, or set FLOWFOKUS_DEMO_MODE=true in local development."
      end
    rescue Flowfokus::WorkosTokens::Invalid => error
      fail_auth! :unauthorized, "invalid_token", error.message
    rescue Flowfokus::WorkosTokens::Unavailable => error
      fail_auth! :service_unavailable, "auth_unavailable", error.message
    rescue Flowfokus::DemoIdentity::ProductionError, Flowfokus::DemoIdentity::TokenError => error
      # Boot already refuses these settings. This guard keeps a request from ever passing.
      fail_auth! :service_unavailable, "auth_not_configured", error.message
    end

    def fail_auth!(status, code, message)
      raise ErrorResponses::RequestError.new(status, code, message)
    end

    def user_for!(claims)
      User.find_by(workos_id: claims.user_workos_id) ||
        fail_auth!(:service_unavailable, "auth_unavailable",
          claims.demo? ? "The demo user is missing. Run bin/rails db:seed." :
            "This WorkOS user has no local record yet. Sync users from WorkOS, or run bin/rails db:seed locally.")
    end
end
