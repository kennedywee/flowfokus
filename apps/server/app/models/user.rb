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
  # `authoritative` marks data fetched from the WorkOS API just now. It may
  # replace data of the same version; an event may not (see WorkosSynced).
  def self.sync_from_workos!(data, deleted: false, at: Time.current, authoritative: false)
    workos_id = WorkosSynced.id!(data)
    version = WorkosSynced.time(data["updated_at"]) || at
    user = lock(WorkosSynced::EXCLUSIVE).find_by(workos_id:)

    if deleted
      return :not_present unless user
      return :already_deleted if user.workos_deleted?

      user.update!(workos_deleted_at: at, workos_updated_at: [ version, user.workos_updated_at ].compact.max)
      user.organization_memberships.live.order(:id).lock.to_a.each { _1.tombstone!(at:) }
      return :deleted
    end

    return :deleted_remotely if user&.workos_deleted? || WorkosEvent.deleted?("user", workos_id)
    return :stale if user&.stale_workos_version?(version)

    user ||= new(workos_id:)
    same_version = user.same_workos_version?(version)
    user.assign_attributes(email: data["email"], first_name: data["first_name"].presence,
      last_name: data["last_name"].presence, workos_updated_at: version)
    return :unchanged unless user.changed?
    return :version_conflict if same_version && !authoritative

    created = user.new_record?
    user.save!
    created ? :created : :updated
  end

  def name = [ first_name, last_name ].compact_blank.join(" ").presence || email
end
