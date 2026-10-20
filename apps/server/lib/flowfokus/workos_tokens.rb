module Flowfokus
  # WorkOS access token verification.
  #
  # NOT IMPLEMENTED in Sprint 1. JWT/JWKS verification, organization claims, and
  # sync arrive with WorkOS staging credentials. Until then every WorkOS token
  # fails closed with 503 so no unverified token can reach business data.
  module WorkosTokens
    class Unavailable < StandardError; end

    module_function

    def configured?(env: ENV)
      env["WORKOS_CLIENT_ID"].present?
    end

    def verify!(_bearer)
      raise Unavailable, "WorkOS token verification is not implemented yet."
    end
  end
end
