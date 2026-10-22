require "rails_helper"

RSpec.describe "WorkOS event sync" do
  let(:api) { WorkosSyncHelpers::FakeWorkosApi.new }

  describe "users" do
    it "creates and updates users by WorkOS ID" do
      event = deliver_workos_event("user.created", workos_user_data("user_a", email: " A@Example.TEST ", first_name: "Ann"))

      expect(event).to have_attributes(status: "processed", outcome: "created")
      expect(User.find_by!(workos_id: "user_a")).to have_attributes(email: "a@example.test", first_name: "Ann")

      deliver_workos_event("user.updated", workos_user_data("user_a", email: "new@example.test", updated_at: 1.minute.from_now))
      expect(User.find_by!(workos_id: "user_a").email).to eq("new@example.test")
    end

    it "never matches or merges a user by email" do
      existing = staff_user("user_existing", email: "shared@example.test")

      deliver_workos_event("user.created", workos_user_data("user_other", email: "shared@example.test"))

      expect(User.where(email: "shared@example.test").pluck(:workos_id)).to contain_exactly("user_existing", "user_other")
      expect(existing.reload.workos_updated_at).to be_nil
    end

    it "ignores an older version that arrives late" do
      deliver_workos_event("user.updated", workos_user_data("user_a", email: "newer@example.test", updated_at: Time.current))
      late = deliver_workos_event("user.updated", workos_user_data("user_a", email: "older@example.test", updated_at: 1.hour.ago))

      expect(late).to have_attributes(status: "processed", outcome: "stale")
      expect(User.find_by!(workos_id: "user_a").email).to eq("newer@example.test")
    end

    it "keeps a deleted user for history, and no later event brings it back" do
      user = staff_user("user_gone")
      location = create_location(chainsaw)
      member = create_member(chainsaw)
      CheckIn.create!(organization: chainsaw, member:, location:, recorded_by_user: user, result: "denied",
        denial_reason: "no_entitlement", checked_in_at: Time.current, idempotency_key: SecureRandom.uuid, request_fingerprint: "x")
      membership = chainsaw.organization_memberships.create!(user:, role: "owner")

      deleted = deliver_workos_event("user.deleted", workos_user_data("user_gone", updated_at: 1.hour.ago))
      stale = deliver_workos_event("user.updated", workos_user_data("user_gone", email: "back@example.test", updated_at: 1.minute.from_now))

      expect(deleted.outcome).to eq("deleted")
      expect(stale.outcome).to eq("deleted_remotely")
      expect(user.reload).to have_attributes(email: "user_gone@example.test")
      expect(user.workos_deleted_at).to be_present
      expect(membership.reload.workos_deleted_at).to be_present
      expect(CheckIn.where(recorded_by_user: user)).to exist
    end

    it "does not create a user whose deletion arrived first" do
      deliver_workos_event("user.deleted", workos_user_data("user_never"))
      created = deliver_workos_event("user.created", workos_user_data("user_never", updated_at: 1.minute.from_now))

      expect(created.outcome).to eq("deleted_remotely")
      expect(User.find_by(workos_id: "user_never")).to be_nil
    end
  end

  describe "organizations" do
    it "updates only the name of a linked gym" do
      chainsaw.update!(published: true, timezone: "Asia/Kuala_Lumpur", currency: "MYR")

      event = deliver_workos_event("organization.updated", workos_organization_data(chainsaw.workos_id, name: "Chainsaw Renamed"))

      expect(event.outcome).to eq("updated")
      expect(chainsaw.reload).to have_attributes(name: "Chainsaw Renamed", slug: "chainsaw", currency: "MYR",
        timezone: "Asia/Kuala_Lumpur", published: true)
    end

    it "never creates or links a gym for an unknown organization" do
      event = nil
      expect {
        event = deliver_workos_event("organization.created", workos_organization_data("org_unknown", name: "Stranger"))
      }.not_to change(Organization, :count)

      expect(event).to have_attributes(status: "ignored", outcome: "organization_not_linked", organization_workos_id: "org_unknown")
    end

    it "keeps a deleted gym and its business history, and hides it from navigation" do
      user = staff_user("user_staff")
      chainsaw.organization_memberships.create!(user:, role: "owner")
      member = create_member(chainsaw)

      event = deliver_workos_event("organization.deleted", workos_organization_data(chainsaw.workos_id))
      later = deliver_workos_event("organization.updated", workos_organization_data(chainsaw.workos_id, name: "Back", updated_at: 1.hour.from_now))

      expect([ event.outcome, later.outcome ]).to eq(%w[deleted deleted_remotely])
      expect(chainsaw.reload).to have_attributes(workos_id: Flowfokus::DemoIdentity::ORGANIZATION_WORKOS_ID, name: "Chainsaw")
      expect(chainsaw.workos_deleted_at).to be_present
      expect(member.reload).to be_persisted
      expect(user.organization_memberships.active).to be_empty
    end
  end

  describe "memberships" do
    let!(:user) { staff_user("user_m") }

    def membership_data(**options)
      workos_membership_data("om_1", user_id: "user_m", organization_id: chainsaw.workos_id, **options)
    end

    it "creates and updates role and status" do
      deliver_workos_event("organization_membership.created", membership_data(status: "pending", role: "receptionist", updated_at: 2.minutes.ago))
      deliver_workos_event("organization_membership.updated", membership_data(status: "active", role: "owner"))

      expect(chainsaw.organization_memberships.sole).to have_attributes(workos_id: "om_1", role: "owner", status: "active")
    end

    it "keeps the newer role when an older event arrives later" do
      deliver_workos_event("organization_membership.updated", membership_data(role: "receptionist", updated_at: Time.current))
      late = deliver_workos_event("organization_membership.created", membership_data(role: "owner", updated_at: 1.hour.ago))

      expect(late.outcome).to eq("stale")
      expect(chainsaw.organization_memberships.sole.role).to eq("receptionist")
    end

    it "keeps a removal when an older update arrives later" do
      deliver_workos_event("organization_membership.created", membership_data(updated_at: 1.hour.ago))
      deliver_workos_event("organization_membership.deleted", membership_data(updated_at: 1.minute.ago))
      late = deliver_workos_event("organization_membership.updated", membership_data(updated_at: Time.current))

      expect(late.outcome).to eq("deleted_remotely")
      expect(chainsaw.organization_memberships.sole.workos_deleted_at).to be_present
      expect(user.organization_memberships.active).to be_empty
    end

    it "keeps a tombstone when the deletion arrives first" do
      deleted = deliver_workos_event("organization_membership.deleted", membership_data)
      created = deliver_workos_event("organization_membership.created", membership_data(updated_at: 1.minute.from_now))

      expect([ deleted.outcome, created.outcome ]).to eq(%w[deleted deleted_remotely])
      expect(OrganizationMembership.active).to be_empty
    end

    it "adopts a copy written before sync" do
      seeded = chainsaw.organization_memberships.create!(user:, role: "owner")

      deliver_workos_event("organization_membership.updated", membership_data(role: "receptionist"))

      expect(seeded.reload).to have_attributes(workos_id: "om_1", role: "receptionist")
      expect(seeded.synced_at).to be_present
    end

    it "ignores memberships of gyms that are not linked, without calling WorkOS" do
      event = deliver_workos_event("organization_membership.created",
        workos_membership_data("om_x", user_id: "user_unknown", organization_id: "org_unknown"), api:)

      expect(event).to have_attributes(status: "ignored", outcome: "organization_not_linked")
      expect(api.calls).to be_empty
      expect(User.find_by(workos_id: "user_unknown")).to be_nil
    end

    it "refuses to move a membership to another organization or user" do
      ironworks
      deliver_workos_event("organization_membership.created", membership_data)

      moved = deliver_workos_event("organization_membership.updated",
        workos_membership_data("om_1", user_id: "user_m", organization_id: ironworks.workos_id, updated_at: 1.minute.from_now))

      expect(moved).to have_attributes(status: "failed", attempts: 1)
      expect(moved.last_error).to include("LinkMismatch")
      expect(OrganizationMembership.sole.organization).to eq(chainsaw)
      expect(ironworks.organization_memberships).to be_empty
    end

    it "fetches an unknown user by ID, and fails visibly when WorkOS is down" do
      api.users["user_new"] = workos_user_data("user_new", email: "new.staff@example.test")
      api.fail_on = :user
      data = workos_membership_data("om_new", user_id: "user_new", organization_id: chainsaw.workos_id)

      event = deliver_workos_event("organization_membership.created", data, api:)
      expect(event).to have_attributes(status: "failed", attempts: 1)
      expect(event.last_error).to include("Unavailable")
      expect(WorkosEvent.needing_retry).to include(event)

      api.fail_on = nil
      expect(WorkosEvent.retry_needed!(api:).map(&:status)).to eq([ "processed" ])
      expect(event.reload).to have_attributes(attempts: 2, last_error: nil)
      expect(User.find_by!(workos_id: "user_new").organization_memberships.sole.workos_id).to eq("om_new")
    end

    it "replaces a membership that WorkOS deleted while the deletion is still on its way" do
      deliver_workos_event("organization_membership.created", membership_data(updated_at: 1.hour.ago))
      fresh = workos_membership_data("om_2", user_id: "user_m", organization_id: chainsaw.workos_id, role: "receptionist")

      event = deliver_workos_event("organization_membership.created", fresh, api:)

      expect(event.outcome).to eq("created")
      expect(api.calls).to eq([ :organization_membership ])
      expect(OrganizationMembership.find_by!(workos_id: "om_1").workos_deleted_at).to be_present
      expect(OrganizationMembership.live.sole).to have_attributes(workos_id: "om_2", role: "receptionist")
    end

    it "fails without changes when WorkOS still has the old membership" do
      deliver_workos_event("organization_membership.created", membership_data)
      api.memberships["om_1"] = membership_data
      fresh = workos_membership_data("om_2", user_id: "user_m", organization_id: chainsaw.workos_id)

      event = deliver_workos_event("organization_membership.created", fresh, api:)

      expect(event.status).to eq("failed")
      expect(OrganizationMembership.live.sole.workos_id).to eq("om_1")
    end
  end

  describe "the ledger" do
    it "processes an event once" do
      event = deliver_workos_event("user.created", workos_user_data("user_once"))

      expect { event.process! }.not_to change { event.reload.attempts }
      expect(event.process!(force: true).reload).to have_attributes(status: "processed", attempts: 2, outcome: "unchanged")
    end

    it "saves unsupported events as ignored" do
      event = deliver_workos_event("session.created", { "id" => "session_1" })

      expect(event).to have_attributes(status: "ignored", outcome: "unsupported_event")
    end

    it "retries pending events whose job was lost" do
      event, = WorkosEvent.accept!(workos_event_body("user.created", workos_user_data("user_lost")))

      expect(WorkosEvent.needing_retry).to be_empty
      travel(WorkosEvent::STUCK_AFTER + 1.second) do
        expect(WorkosEvent.retry_needed!.map(&:workos_id)).to eq([ event.workos_id ])
      end
      expect(event.reload.status).to eq("processed")
    end

    it "keeps the received event immutable in the database" do
      event, = WorkosEvent.accept!(workos_event_body("user.created", workos_user_data("user_fixed")))

      expect { in_savepoint { WorkosEvent.where(id: event.id).update_all(payload: { "id" => "forged" }) } }
        .to raise_error(ActiveRecord::StatementInvalid, /immutable/)
      expect { WorkosEvent.where(id: event.id).update_all(status: "failed", last_error: "x") }.not_to raise_error
    end
  end
end
