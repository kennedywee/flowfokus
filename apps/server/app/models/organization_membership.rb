# Synced copy of a WorkOS staff membership. Used for reporting, lookups, and
# the portal's organization list. Never used to authorize a request:
# permissions come from verified token claims.
class OrganizationMembership < ApplicationRecord
  belongs_to :organization
  belongs_to :user

  scope :active, -> { where(status: "active") }

  validates :role, presence: true
  validates :status, inclusion: { in: %w[active inactive pending] }

  # Records what a verified WorkOS token says: this user is an active member
  # with this role. Writes only when something changed.
  def self.observe!(organization:, user:, role:)
    membership = find_or_initialize_by(organization:, user:)
    membership.status = "active"
    membership.role = role if role.present?
    membership.role ||= "member"
    membership.save! if membership.changed?
    membership
  rescue ActiveRecord::RecordNotUnique
    # A parallel request created it first. Its copy is just as current.
    find_by!(organization:, user:)
  end

  def as_api
    { slug: organization.slug, name: organization.name, workos_organization_id: organization.workos_id, role: }
  end
end
