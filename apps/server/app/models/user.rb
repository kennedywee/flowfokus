# Local reference to a WorkOS identity. Rails stores no passwords.
#
# WorkOS sync matches users by WorkOS ID only. It never matches or merges by email.
class User < ApplicationRecord
  include WorkosSynced

  has_many :organization_memberships, dependent: :restrict_with_exception
  has_many :members, dependent: :restrict_with_exception

  normalizes :email, with: ->(email) { email.strip.downcase }
  validates :workos_id, presence: true, uniqueness: true
  validates :email, presence: true

  # Applies WorkOS user data (an event's `data` or an API record). Call inside a
  # transaction. Returns the outcome as a symbol.
  #
  # A deletion keeps the row and its email and names for history. It removes the
  # user's live staff memberships from the synced copy.
  def self.sync_from_workos!(data, deleted: false, at: Time.current)
    workos_id = WorkosSynced.id!(data)
    version = WorkosSynced.time(data["updated_at"]) || at
    user = lock.find_by(workos_id:)

    if deleted
      return :not_present unless user
      return :already_deleted if user.workos_deleted?

      user.update!(workos_deleted_at: at, workos_updated_at: [ version, user.workos_updated_at ].compact.max)
      user.organization_memberships.live.find_each { _1.tombstone!(at:) }
      return :deleted
    end

    return :deleted_remotely if user&.workos_deleted? || WorkosEvent.deleted?("user", workos_id)
    return :stale if user&.stale_workos_version?(version)

    user ||= new(workos_id:)
    user.assign_attributes(email: data["email"], first_name: data["first_name"].presence,
      last_name: data["last_name"].presence, workos_updated_at: version)
    return :unchanged unless user.changed?

    created = user.new_record?
    user.save!
    created ? :created : :updated
  end

  def name = [ first_name, last_name ].compact_blank.join(" ").presence || email
end
