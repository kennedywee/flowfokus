module Flowfokus
  # Verified claims of a Bearer token. Only a verifier creates these; request
  # bodies, query strings, and Flowfokus-* headers never do.
  IdentityClaims = Data.define(:user_workos_id, :organization_workos_id, :permissions, :demo, :role) do
    def initialize(role: nil, **claims) = super(role:, **claims)

    def demo? = demo
  end
end
