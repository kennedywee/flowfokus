# One use of an entitlement: a granted check-in, or a booked spot. Unlimited
# rights also record usage. A cancelled booking can return its use; the row
# stays with the return time.
class EntitlementUsage < ApplicationRecord
  include TenantOwned

  belongs_to :entitlement
  belongs_to :check_in, optional: true
  belongs_to :booking, optional: true
  same_organization_as :entitlement, :check_in, :booking

  validate { errors.add(:base, "needs a check-in or a booking") unless check_in.present? ^ booking.present? }
end
