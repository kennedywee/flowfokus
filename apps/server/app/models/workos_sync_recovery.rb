# Automatic recovery for WorkOS sync. One pass:
#
# 1. Processes pending events whose job was lost, and failed events whose
#    backoff has passed. A failed event waits 2^attempts minutes, at most an
#    hour, and stops after MAX_ATTEMPTS. `workos:events:retry` still forces it.
# 2. Reconciles each linked gym whose last full sync is older than
#    `reconcile_after`. That repairs webhooks that never arrived.
#
# The schedule lives in the database (`updated_at`, `attempts`, and
# `organizations.workos_synced_at`), so a restart loses nothing and two
# runners cannot drift apart. Sync is idempotent, so an overlap is safe.
class WorkosSyncRecovery
  MAX_ATTEMPTS = 20
  MAX_BACKOFF = 1.hour

  def initialize(api: nil, reconcile_after: 6.hours, at: Time.current)
    @api, @reconcile_after, @at = api, reconcile_after, at
  end

  def run_once
    { events: retry_events, gyms: reconcile_gyms }
  end

  def due_events
    stuck = WorkosEvent.where(status: "pending", created_at: ...(@at - WorkosEvent::STUCK_AFTER))
    failed = WorkosEvent.where(status: "failed").where(attempts: ...MAX_ATTEMPTS).select do |event|
      event.updated_at <= @at - [ (2**event.attempts).minutes, MAX_BACKOFF ].min
    end
    (stuck.to_a + failed).sort_by { [ _1.occurred_at, _1.created_at ] }
  end

  private
    def retry_events
      due_events.map { |event| event.process!(api: @api) }.group_by(&:status).transform_values(&:size)
    end

    def reconcile_gyms
      return {} if @reconcile_after.nil?

      stale = Organization.linked_to_workos.where(workos_synced_at: nil)
        .or(Organization.linked_to_workos.where(workos_synced_at: ...(@at - @reconcile_after))).order(:slug)
      stale.to_h do |organization|
        organization.reconcile_with_workos!(api: api, at: @at)
        [ organization.slug, "reconciled" ]
      rescue StandardError => error
        Rails.logger.error("WorkOS reconcile of #{organization.slug} failed: #{error.class}: #{error.message}")
        [ organization.slug, "failed" ]
      end
    end

    def api = @api ||= Flowfokus::WorkosApi.from_env
end
