# Synced copy of a WorkOS staff membership. Used for reporting and lookups.
# Never used to authorize a request: permissions come from verified token claims.
class OrganizationMembership < ApplicationRecord
  belongs_to :organization
  belongs_to :user

  validates :role, presence: true
  validates :status, inclusion: { in: %w[active inactive pending] }
end
