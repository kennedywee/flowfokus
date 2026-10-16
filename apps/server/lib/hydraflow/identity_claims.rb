module Hydraflow
  # Verified claims of a Bearer token. Only a verifier creates these; request
  # bodies, query strings, and Hydraflow-* headers never do.
  IdentityClaims = Data.define(:user_workos_id, :organization_workos_id, :permissions, :demo) do
    def demo? = demo
  end
end
