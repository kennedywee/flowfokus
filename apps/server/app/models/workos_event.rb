# The ledger of accepted WorkOS webhook events.
#
# The webhook endpoint saves each verified event here before any processing,
# then answers 200. WorkosEventJob applies it later. The ledger makes sync:
#
# - Idempotent: the WorkOS event ID is unique. A redelivery finds the saved row.
# - Order-safe: each record keeps the remote `updated_at` it last applied, and
#   deletions are terminal. A stale or delayed event changes nothing.
# - Observable: every event ends as processed, ignored, or failed, with an
#   outcome or the last error. Failed and stuck events wait for
#   `bin/rails workos:events:retry`.
#
# The trigger `workos_events_immutable` keeps the received event unchanged.
class WorkosEvent < ApplicationRecord
  class Malformed < StandardError; end

  STATUSES = %w[pending processed ignored failed].freeze
  SUBJECTS = { "user" => "User", "organization" => "Organization", "organization_membership" => "OrganizationMembership" }.freeze
  ACTIONS = %w[created updated deleted].freeze
  # Outcomes that applied nothing because Flowfokus does not handle the event
  # here. They stay visible. Link the gym if needed, then reconcile it, to repair them.
  # A version_conflict event carried the same remote version as the local copy,
  # with different data. Reconcile the gym to apply WorkOS's current state.
  IGNORED_OUTCOMES = %w[organization_not_linked unsupported_event version_conflict].freeze
  # A pending event older than this has lost its job, for example after a restart.
  STUCK_AFTER = 5.minutes
  ID_FORMAT = /\A[A-Za-z0-9_\-]{1,255}\z/

  validates :status, inclusion: { in: STATUSES }

  scope :needing_retry, -> { where(status: "failed").or(where(status: "pending", created_at: ...STUCK_AFTER.ago)) }

  # Saves a verified webhook body. Returns [event, duplicate].
  # Raises Malformed when the body is not a WorkOS event.
  def self.accept!(body)
    document = JSON.parse(body)
    raise Malformed, "The body is not a JSON object." unless document.is_a?(Hash)

    workos_id, event_type, data = document.values_at("id", "event", "data")
    occurred_at = WorkosSynced.time(document["created_at"])
    unless workos_id.is_a?(String) && ID_FORMAT.match?(workos_id) && event_type.is_a?(String) &&
        event_type.match?(/\A[a-z_]+(\.[a-z_]+)+\z/) && data.is_a?(Hash) && occurred_at
      raise Malformed, "The body is not a WorkOS event."
    end

    subject_id = data["id"] if data["id"].is_a?(String)
    organization_workos_id = event_type.start_with?("organization.") ? subject_id : data["organization_id"]
    organization_workos_id = nil unless organization_workos_id.is_a?(String)

    inserted = insert({ workos_id:, event_type:, subject_id:, organization_workos_id:, occurred_at:, payload: document },
      unique_by: :workos_id, returning: %w[id])
    [ find_by!(workos_id:), inserted.rows.empty? ]
  rescue JSON::ParserError
    raise Malformed, "The body is not valid JSON."
  end

  # True when WorkOS sent a deletion for this record. The ledger is the
  # tombstone for records Rails never stored.
  def self.deleted?(subject, subject_id)
    where(event_type: "#{subject}.deleted", subject_id:).exists?
  end

  def self.membership_deleted?(organization:, user:)
    return false if organization.workos_id.blank?

    where(event_type: "organization_membership.deleted", organization_workos_id: organization.workos_id)
      .where("payload -> 'data' ->> 'user_id' = ?", user.workos_id).exists?
  end

  # Processes failed events and pending events whose job was lost, oldest first.
  def self.retry_needed!(api: nil)
    needing_retry.order(:occurred_at, :created_at).map { _1.process!(api:) }
  end

  def settled? = status.in?(%w[processed ignored])

  # Applies the event once. Never raises: a failure marks the event failed.
  # `force` reprocesses a settled event, which is safe because sync is idempotent.
  def process!(api: nil, force: false)
    return self if settled? && !force

    apply!(api, force:)
    self
  rescue StandardError => error
    message = "#{error.class}: #{error.message}".truncate(2_000)
    Rails.logger.error("WorkOS event #{workos_id} (#{event_type}) failed: #{message}")
    update!(status: "failed", attempts: attempts + 1, last_error: message, processed_at: nil)
    self
  end

  def as_webhook_api(duplicate:)
    { id: workos_id, event: event_type, status:, duplicate: }
  end

  private
    def apply!(api, force:)
      subject, action = event_type.split(".", 2)
      model = SUBJECTS[subject]&.constantize
      return finish!(:unsupported_event) unless model && action.in?(ACTIONS)

      data = payload.fetch("data")
      deleted = action == "deleted"

      if model == OrganizationMembership && !deleted
        user = membership_user(data, api)
        return finish!(user) if user.is_a?(Symbol)
      end

      tries = 0
      begin
        transaction do
          lock!
          next if settled? && !force

          finish!(model.sync_from_workos!(data, deleted:, at: occurred_at))
        end
      rescue OrganizationMembership::Superseded => error
        raise if (tries += 1) > 1

        api ||= Flowfokus::WorkosApi.from_env
        release_superseded!(error.membership, api)
        retry
      rescue ActiveRecord::RecordNotUnique
        # A parallel sync created the record first. Apply again against it.
        raise if (tries += 1) > 1

        retry
      end
    end

    def finish!(outcome)
      outcome = outcome.to_s
      update!(status: IGNORED_OUTCOMES.include?(outcome) ? "ignored" : "processed", outcome:,
        attempts: attempts + 1, last_error: nil, processed_at: Time.current)
    end

    # The local user for a membership event. Fetches an unknown user from
    # WorkOS by ID. Returns an outcome symbol when there is nothing to apply.
    def membership_user(data, api)
      user_workos_id = WorkosSynced.id!(data, "user_id")
      return :organization_not_linked unless Organization.exists?(workos_id: WorkosSynced.id!(data, "organization_id"))

      user = User.find_by(workos_id: user_workos_id)
      return user if user

      api ||= Flowfokus::WorkosApi.from_env
      remote = begin
        WorkosSynced.fetched!(api.user(user_workos_id), user_workos_id)
      rescue Flowfokus::WorkosApi::NotFound
        return :user_deleted
      end
      transaction { User.sync_from_workos!(remote) }
      User.live.find_by(workos_id: user_workos_id) || :user_deleted
    end

    # WorkOS keeps one membership per user and organization. When a new one
    # arrives while the old copy is live, the old one was deleted, unless
    # WorkOS still has it.
    def release_superseded!(membership, api)
      WorkosSynced.fetched!(api.organization_membership(membership.workos_id), membership.workos_id)
      raise OrganizationMembership::Superseded, membership
    rescue Flowfokus::WorkosApi::NotFound
      transaction do
        # Lock order: organization, user, membership (see WorkosSynced).
        Organization.lock(WorkosSynced::SHARED).find(membership.organization_id)
        User.lock(WorkosSynced::EXCLUSIVE).find(membership.user_id)
        membership.lock!
        membership.tombstone!(at: occurred_at) unless membership.workos_deleted?
      end
    end
end
