# Synced copy of a WorkOS staff membership. Used for reporting, lookups, and
# the portal's organization list. Never used to authorize a request:
# permissions come from verified token claims.
#
# WorkOS sync is the authority for this copy. A removed membership stays as a
# tombstone (`workos_deleted_at`), so stale events and old tokens cannot bring
# it back. Only one live copy exists per user and organization.
class OrganizationMembership < ApplicationRecord
  include WorkosSynced

  STATUSES = %w[active inactive pending].freeze

  # Another live membership for the same user and organization still exists
  # locally. WorkOS has one membership per pair, so the old one may be deleted.
  class Superseded < StandardError
    attr_reader :membership

    def initialize(membership)
      @membership = membership
      super("Membership #{membership.workos_id} is still live for this user and organization.")
    end
  end

  # A WorkOS membership ID that is already linked to another user or organization.
  class LinkMismatch < StandardError; end

  belongs_to :organization
  belongs_to :user

  scope :active, -> { live.where(status: "active") }

  validates :role, presence: true
  validates :status, inclusion: { in: STATUSES }

  # Records what a verified WorkOS token says: this user is an active member
  # with this role. It only fills gaps before sync runs:
  # - It never changes a copy that WorkOS sync already wrote.
  # - It never creates a copy where sync removed one, or for a deleted user or
  #   organization. An old token cannot undo a removal or a newer role.
  # It holds the organization and user locks that sync takes (see WorkosSynced),
  # so a sync that runs while it works waits, then applies its data last.
  # Writes only when something changed. Returns the membership or nil.
  def self.observe!(organization:, user:, role:)
    transaction do
      organization = Organization.lock(WorkosSynced::SHARED).find(organization.id)
      user = User.lock(WorkosSynced::EXCLUSIVE).find(user.id)
      next nil if user.workos_deleted? || organization.workos_deleted?

      membership = live.lock.find_by(organization:, user:)
      if membership.nil?
        next nil if where(organization:, user:).where.not(workos_deleted_at: nil).exists?
        next nil if WorkosEvent.membership_deleted?(organization:, user:)

        membership = new(organization:, user:)
      end
      next membership if membership.synced_from_workos?

      membership.status = "active"
      membership.role = role if role.present?
      membership.role ||= "member"
      membership.save! if membership.changed?
      membership
    end
  rescue ActiveRecord::RecordNotUnique
    # A writer outside sync, such as db:seed, created it first. Its copy wins.
    live.find_by(organization:, user:)
  end

  # Applies WorkOS membership data. Call inside a transaction. Returns the
  # outcome as a symbol.
  #
  # The membership must belong to an existing linked gym, and its user must
  # exist locally. A WorkOS ID is never moved to another user or organization.
  # Raises Superseded when another live copy exists for the pair; the caller
  # checks WorkOS and retries. `authoritative`: see User.sync_from_workos!.
  def self.sync_from_workos!(data, deleted: false, at: Time.current, authoritative: false)
    workos_id = WorkosSynced.id!(data)
    organization_workos_id = WorkosSynced.id!(data, "organization_id")
    user_workos_id = WorkosSynced.id!(data, "user_id")
    version = WorkosSynced.time(data["updated_at"]) || at

    # Lock order: organization, user, then membership rows (see WorkosSynced).
    organization = Organization.lock(WorkosSynced::SHARED).find_by(workos_id: organization_workos_id)
    return :organization_not_linked unless organization

    user = User.lock(WorkosSynced::EXCLUSIVE).find_by(workos_id: user_workos_id)
    membership = lock.find_by(workos_id:)
    if membership && (membership.organization_id != organization.id || membership.user.workos_id != user_workos_id)
      raise LinkMismatch, "WorkOS membership #{workos_id} is linked to another user or organization."
    end

    if deleted
      # A copy written before sync has no WorkOS ID yet. Adopt it.
      membership ||= user && live.lock.find_by(organization:, user:, workos_id: nil)
      return :already_deleted if membership&.workos_deleted?
      # Keep a tombstone even when no copy existed, so an old token cannot add one.
      return :not_present unless membership || user

      membership ||= new(organization:, user:, role: role_slug(data) || "member",
        status: STATUSES.include?(data["status"]) ? data["status"] : "inactive")

      membership.tombstone!(at:, workos_id:, version:)
      return :deleted
    end

    return :deleted_remotely if membership&.workos_deleted? || WorkosEvent.deleted?("organization_membership", workos_id)
    return :organization_deleted if organization.workos_deleted?
    return :user_missing unless user
    return :user_deleted if user.workos_deleted?
    return :stale if membership&.stale_workos_version?(version)

    if membership.nil?
      membership = live.lock.find_by(organization:, user:)
      raise Superseded, membership if membership&.workos_id
      membership ||= new(organization:, user:)
    end

    same_version = membership.same_workos_version?(version)
    membership.assign_attributes(workos_id:, status: data["status"], role: role_slug(data) || membership.role || "member",
      workos_updated_at: version)
    return :unchanged unless membership.changed?
    return :version_conflict if same_version && !authoritative

    created = membership.new_record?
    membership.synced_at = Time.current
    membership.save!
    created ? :created : :updated
  end

  def self.role_slug(data)
    role = data["role"].is_a?(Hash) ? data["role"]["slug"] : nil
    role ||= Array(data["roles"]).find { _1.is_a?(Hash) && _1["slug"].is_a?(String) }&.dig("slug")
    role.presence if role.is_a?(String)
  end

  def synced_from_workos? = workos_id.present? || workos_updated_at.present?

  # Marks the membership removed. Keeps the row for history.
  def tombstone!(at: Time.current, workos_id: self.workos_id, version: nil)
    update!(workos_id:, workos_deleted_at: at, synced_at: Time.current,
      workos_updated_at: [ version, workos_updated_at ].compact.max)
  end

  def as_api
    { slug: organization.slug, name: organization.name, workos_organization_id: organization.workos_id, role: }
  end
end
