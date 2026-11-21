# One use of an entitlement: a booked spot. Unlimited rights also record usage. A
# cancelled booking can return its use; the row stays with the return time.
#
# Older rows can point at a walk-in check-in through `check_in_id`. That feature
# left the product. The column and its rows stay as history, and nothing writes
# them. New rows need a booking.
class EntitlementUsage < ApplicationRecord
  include TenantOwned

  belongs_to :entitlement
  belongs_to :booking, optional: true
  same_organization_as :entitlement, :booking

  validate { errors.add(:base, "needs a booking") unless booking.present? || (persisted? && check_in_id.present?) }
end
