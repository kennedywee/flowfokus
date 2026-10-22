# Shared rules for local copies of WorkOS records.
#
# - `workos_updated_at` is the remote version last applied. An older version is stale.
#   The same version with different data is a conflict: sync cannot tell which
#   is newer, so it changes nothing and reconciliation applies WorkOS's current state.
# - `workos_deleted_at` marks a record that WorkOS deleted. The row stays, so
#   history keeps its references, and no later event can bring it back.
#   WorkOS never reuses an ID.
#
# Lock order. Every transaction that writes synced identity data takes row
# locks in this order, so two writers cannot deadlock:
#
#   1. Organization: EXCLUSIVE for organization sync and reconciliation,
#      SHARED for membership writes (sync and token observation).
#   2. Users, EXCLUSIVE, in WorkOS ID order when there is more than one.
#   3. Organization memberships, FOR UPDATE, in row ID order.
#
# A membership write holds its user and organization, so it cannot interleave
# with a deletion of either, or with another write for the same pair.
# EXCLUSIVE is FOR NO KEY UPDATE: foreign key checks from business writes
# (FOR KEY SHARE) are never blocked.
module WorkosSynced
  extend ActiveSupport::Concern

  EXCLUSIVE = "FOR NO KEY UPDATE".freeze
  SHARED = "FOR SHARE".freeze

  included do
    scope :live, -> { where(workos_deleted_at: nil) }
  end

  # Parses a WorkOS ISO 8601 timestamp. Returns nil for anything else.
  def self.time(value)
    Time.iso8601(value) if value.is_a?(String)
  rescue ArgumentError
    nil
  end

  # Reads a required WorkOS ID from event or API data.
  def self.id!(data, key = "id")
    value = data.is_a?(Hash) ? data[key] : nil
    raise ArgumentError, "WorkOS data has no #{key}." unless value.is_a?(String) && value.match?(/\A[A-Za-z0-9_\-]{1,255}\z/)

    value
  end

  # Checks that a record fetched from the WorkOS API is the one requested.
  # A wrong answer must never change another record.
  def self.fetched!(record, id)
    actual = record.is_a?(Hash) ? record["id"] : nil
    raise Flowfokus::WorkosApi::Error, "WorkOS returned #{actual.inspect} when asked for #{id}." unless actual == id

    record
  end

  def workos_deleted? = workos_deleted_at.present?

  # True when `version` is older than the version already applied.
  def stale_workos_version?(version)
    version.present? && workos_updated_at.present? && version < workos_updated_at
  end

  # True when `version` equals the version already applied.
  def same_workos_version?(version)
    version.present? && workos_updated_at.present? && version == workos_updated_at
  end
end
