# WorkOS identity sync commands. Each prints a summary and exits non-zero on failure.
namespace :workos do
  desc "Import or repair WorkOS users and memberships for linked gyms. ORGANIZATION=<slug> limits it to one gym."
  task reconcile: :environment do
    api = begin
      Flowfokus::WorkosApi.from_env
    rescue Flowfokus::WorkosApi::Unavailable => error
      abort "WorkOS sync is not configured: #{error.message}"
    end
    scope = Organization.linked_to_workos.order(:slug)
    scope = scope.where(slug: ENV["ORGANIZATION"].to_s.strip.downcase) if ENV["ORGANIZATION"].present?
    abort "No linked gym matches. Only gyms with a WorkOS organization ID are reconciled." if scope.none?

    failures = 0
    scope.each do |organization|
      summary = organization.reconcile_with_workos!(api:)
      puts "#{organization.slug}: #{summary.sort.map { |key, count| "#{key}=#{count}" }.join(' ')}"
    rescue StandardError => error
      failures += 1
      puts "#{organization.slug}: FAILED, nothing changed. #{error.class}: #{error.message}"
    end
    abort "#{failures} gym(s) failed to reconcile." if failures.positive?
  end

  desc "Run one recovery pass: retry due events, then reconcile gyms not synced for RECONCILE_HOURS (default 6, 0 turns it off)."
  task recover: :environment do
    puts WorkosSyncRecovery.new(reconcile_after: workos_reconcile_after).run_once.to_json
  end

  namespace :recover do
    desc "Run recovery passes every INTERVAL seconds (default 60) until stopped. For a long-running jobs process."
    task watch: :environment do
      interval = Integer(ENV.fetch("INTERVAL", "60"))
      abort "INTERVAL must be at least 10 seconds." if interval < 10
      stopping = false
      %w[INT TERM].each { |signal| trap(signal) { stopping = true } }
      $stdout.sync = true
      puts "WorkOS recovery: every #{interval}s."
      until stopping
        begin
          result = WorkosSyncRecovery.new(reconcile_after: workos_reconcile_after).run_once
          puts "#{Time.current.iso8601} #{result.to_json}" if result.values.any?(&:present?)
        rescue StandardError => error
          puts "#{Time.current.iso8601} recovery failed: #{error.class}: #{error.message}"
        ensure
          ActiveRecord::Base.connection_handler.clear_active_connections!
        end
        interval.times { break if stopping; sleep 1 }
      end
      puts "WorkOS recovery stopped."
    end
  end

  def workos_reconcile_after
    hours = Float(ENV.fetch("RECONCILE_HOURS", "6"))
    hours.positive? ? hours.hours : nil
  end

  namespace :events do
    desc "Show WorkOS event counts and the events that need attention."
    task status: :environment do
      WorkosEvent.group(:status).count.sort.each { |status, count| puts "#{status}: #{count}" }
      attention = WorkosEvent.needing_retry.or(WorkosEvent.where(status: "ignored")).order(created_at: :desc).limit(50)
      attention.each do |event|
        puts [ event.workos_id, event.event_type, event.status, event.outcome, event.attempts,
          event.created_at.iso8601, event.last_error ].compact.join("  ")
      end
    end

    desc "Process failed and stuck WorkOS events. EVENT=<WorkOS event ID> reprocesses one event in any status."
    task retry: :environment do
      events = if ENV["EVENT"].present?
        [ WorkosEvent.find_by!(workos_id: ENV["EVENT"].strip).process!(force: true) ]
      else
        WorkosEvent.retry_needed!
      end
      events.each { |event| puts [ event.workos_id, event.event_type, event.status, event.outcome || event.last_error ].join("  ") }
      puts "No events need a retry." if events.empty?
      failed = events.count { _1.status == "failed" }
      abort "#{failed} event(s) still failed." if failed.positive?
    end
  end
end
