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
  #
  # Two syncs can both miss a user that does not exist yet, for example a
  # user.created event and a membership event that fetched the same user. The
  # second insert then fails on the unique WorkOS ID, or on the uniqueness
  # validation if the first already committed. Either way the second sync
  # applies its data again against the saved row, with the usual version rules.
  def self.sync_from_workos!(data, deleted: false, at: Time.current, authoritative: false)
    workos_id = WorkosSynced.id!(data)
    version = WorkosSynced.time(data["updated_at"]) || at
    tries = 0

    begin
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

      if user.persisted?
        user.save!
        return :updated
      end

      # A savepoint, so a failed insert leaves the caller's transaction usable.
      transaction(requires_new: true) { user.save! }
      :created
    rescue ActiveRecord::RecordNotUnique, ActiveRecord::RecordInvalid => error
      raise unless user&.new_record? && workos_id_taken?(error) && (tries += 1) == 1

      retry
    end
  end

  # True when an insert failed only because another sync created the same
  # WorkOS ID first. Any other invalid data still raises.
  def self.workos_id_taken?(error)
    case error
    when ActiveRecord::RecordNotUnique
      error.cause.respond_to?(:result) &&
        error.cause.result&.error_field(PG::PG_DIAG_CONSTRAINT_NAME) == "index_users_on_workos_id"
    when ActiveRecord::RecordInvalid
      errors = error.record.errors
      errors.attribute_names == [ :workos_id ] && errors.details[:workos_id].all? { _1[:error] == :taken }
    end
  end
  private_class_method :workos_id_taken?

  def name = [ first_name, last_name ].compact_blank.join(" ").presence || email
end
