# Bearer token authentication for /staff/* and /member/*.
#
# Order of checks:
# 1. No Bearer token: 401 unauthenticated.
# 2. Demo mode (development/test only) and the demo token: fixed demo claims.
# 3. WorkOS configured: 503 auth_unavailable. Verification ships next sprint.
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

      if (claims = Hydraflow::DemoIdentity.claims_for(token))
        claims
      elsif Hydraflow::WorkosTokens.configured?
        Hydraflow::WorkosTokens.verify!(token)
      elsif Hydraflow::DemoIdentity.enabled?
        fail_auth! :unauthorized, "invalid_token", "The Bearer token is not valid."
      else
        fail_auth! :service_unavailable, "auth_not_configured",
          "Authentication is not configured. Set up WorkOS, or set HYDRAFLOW_DEMO_MODE=true in local development."
      end
    rescue Hydraflow::WorkosTokens::Unavailable => error
      fail_auth! :service_unavailable, "auth_unavailable", error.message
    end

    def fail_auth!(status, code, message)
      raise ErrorResponses::RequestError.new(status, code, message)
    end

    def user_for!(claims)
      User.find_by(workos_id: claims.user_workos_id) ||
        fail_auth!(:service_unavailable, "auth_unavailable",
          claims.demo? ? "The demo user is missing. Run bin/rails db:seed." : "The user is not synced yet.")
    end
end
