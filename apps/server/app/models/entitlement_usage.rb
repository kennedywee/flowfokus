# One consumption of an entitlement by a granted check-in. Unlimited rights also record usage.
class EntitlementUsage < ApplicationRecord
  include TenantOwned

  belongs_to :entitlement
  belongs_to :check_in
  same_organization_as :entitlement, :check_in
end
