# Shared rules for local copies of WorkOS records.
#
# - `workos_updated_at` is the remote version last applied. An older version is stale.
# - `workos_deleted_at` marks a record that WorkOS deleted. The row stays, so
#   history keeps its references, and no later event can bring it back.
#   WorkOS never reuses an ID.
module WorkosSynced
  extend ActiveSupport::Concern

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

  def workos_deleted? = workos_deleted_at.present?

  # True when `version` is older than the version already applied.
  def stale_workos_version?(version)
    version.present? && workos_updated_at.present? && version < workos_updated_at
  end
end
