require "rails_helper"

RSpec.describe WorkosSyncRecovery do
  let(:api) { WorkosSyncHelpers::FakeWorkosApi.new }
  let(:now) { Time.zone.parse("2026-11-01 12:00:00") }

  def event(status:, attempts: 0, created_at: now - 1.hour, updated_at: created_at)
    data = workos_user_data("user_#{SecureRandom.hex(4)}")
    record, = WorkosEvent.accept!(workos_event_body("user.created", data))
    record.update_columns(status:, attempts:, created_at:, updated_at:)
    record
  end

  it "processes lost pending events and failed events past their backoff" do
    stuck = event(status: "pending")
    fresh = event(status: "pending", created_at: now - 1.minute)
    retry_now = event(status: "failed", attempts: 2, updated_at: now - 5.minutes)
    waiting = event(status: "failed", attempts: 5, updated_at: now - 10.minutes)
    given_up = event(status: "failed", attempts: WorkosSyncRecovery::MAX_ATTEMPTS, updated_at: now - 1.day)

    result = described_class.new(api:, reconcile_after: nil, at: now).run_once

    expect(result[:events]).to eq("processed" => 2)
    expect([ stuck, retry_now ].map { _1.reload.status }).to all(eq("processed"))
    expect(fresh.reload.status).to eq("pending")
    expect([ waiting, given_up ].map { _1.reload.status }).to all(eq("failed"))
  end

  it "reconciles only gyms whose last full sync is old" do
    stale = create_organization(slug: "stale", workos_id: "org_stale").tap { _1.update!(workos_synced_at: now - 7.hours) }
    recent = create_organization(slug: "recent", workos_id: "org_recent").tap { _1.update!(workos_synced_at: now - 1.hour) }
    never = create_organization(slug: "never", workos_id: "org_never")
    create_organization(slug: "unlinked", workos_id: nil)
    [ stale, recent, never ].each { api.organizations[_1.workos_id] = workos_organization_data(_1.workos_id, name: _1.name) }

    result = described_class.new(api:, at: now).run_once

    expect(result[:gyms]).to eq("never" => "reconciled", "stale" => "reconciled")
    expect(stale.reload.workos_synced_at).to eq(now)
    expect(recent.reload.workos_synced_at).to eq(now - 1.hour)
  end

  it "keeps going when one gym fails" do
    create_organization(slug: "broken", workos_id: "org_broken")
    ok = create_organization(slug: "fine", workos_id: "org_fine")
    api.organizations[ok.workos_id] = workos_organization_data(ok.workos_id)
    api.fail_on = nil
    allow(api).to receive(:organization).and_call_original
    allow(api).to receive(:organization).with("org_broken").and_raise(Flowfokus::WorkosApi::Unavailable, "down")

    expect(described_class.new(api:, at: now).run_once[:gyms]).to eq("broken" => "failed", "fine" => "reconciled")
  end
end
