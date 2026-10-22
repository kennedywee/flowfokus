require "rails_helper"

# Runs real parallel transactions against WorkOS sync and token observation.
# Commits data, so it cleans up afterwards. Each race pauses one writer inside
# its transaction, starts the other, checks that the other waits, then lets
# both finish. The final state must be the same as if they ran in order.
RSpec.describe "Concurrent WorkOS sync" do
  self.use_transactional_tests = false

  after do
    tables = ActiveRecord::Base.connection.tables - %w[schema_migrations ar_internal_metadata]
    ActiveRecord::Base.connection.execute("TRUNCATE #{tables.map { %("#{_1}") }.join(', ')} CASCADE")
  end

  let!(:user) { staff_user("user_race") }

  def membership_data(**options)
    workos_membership_data("om_race", user_id: "user_race", organization_id: chainsaw.workos_id, **options)
  end

  def in_thread(&block)
    Thread.new do
      ActiveRecord::Base.connection_pool.with_connection { block.call }
    rescue StandardError => error
      error
    end
  end

  # Pauses the first call to `method` until the block returns. Later calls,
  # including those from the racing thread, pass straight through.
  def pause_first_call(target, method, any_instance: false)
    reached = Concurrent::Event.new
    release = Concurrent::Event.new
    paused = Concurrent::AtomicBoolean.new
    wrapper = lambda do |original, *args, **options, &block|
      if paused.make_true
        reached.set
        release.wait(10)
      end
      original.call(*args, **options, &block)
    end
    any_instance ? allow_any_instance_of(target).to(receive(method).and_wrap_original(&wrapper)) :
      allow(target).to(receive(method).and_wrap_original(&wrapper))

    yield reached, release
  ensure
    release&.set
  end

  # Starts `first`, pauses it at `method`, runs `second`, and checks that
  # `second` waits for `first` to commit.
  def race(target, method, first:, second:, any_instance: false)
    pause_first_call(target, method, any_instance:) do |reached, release|
      first_thread = in_thread(&first)
      expect(reached.wait(10)).to be(true), -> { "the first writer never reached #{method}: #{first_thread.value.inspect}" }

      second_thread = in_thread(&second)
      expect(second_thread.join(0.5)).to be_nil, "the second writer did not wait for the first"

      release.set
      [ first_thread.value, second_thread.value ].each { expect(_1).not_to be_a(StandardError) }
    end
  end

  it "applies a sync that runs during token observation after it, so the old token never wins" do
    membership = chainsaw.organization_memberships.create!(user:, role: "member")

    race(OrganizationMembership, :synced_from_workos?, any_instance: true,
      first: -> { OrganizationMembership.observe!(organization: chainsaw, user:, role: "owner") },
      second: -> { deliver_workos_event("organization_membership.updated", membership_data(role: "receptionist", status: "inactive")) })

    expect(membership.reload).to have_attributes(workos_id: "om_race", role: "receptionist", status: "inactive")
    expect(WorkosEvent.sole).to have_attributes(status: "processed", outcome: "updated")
  end

  it "removes a copy that token observation creates while the membership deletion is applied" do
    race(WorkosEvent, :membership_deleted?,
      first: -> { OrganizationMembership.observe!(organization: chainsaw, user:, role: "owner") },
      second: -> { deliver_workos_event("organization_membership.deleted", membership_data) })

    expect(OrganizationMembership.live).to be_empty
    expect(OrganizationMembership.sole).to have_attributes(workos_id: "om_race", workos_deleted_at: be_present)
  end

  it "leaves no live copy when token observation races the user's deletion" do
    race(WorkosEvent, :membership_deleted?,
      first: -> { OrganizationMembership.observe!(organization: chainsaw, user:, role: "owner") },
      second: -> { deliver_workos_event("user.deleted", workos_user_data("user_race")) })

    expect(user.reload.workos_deleted_at).to be_present
    expect(OrganizationMembership.live).to be_empty
  end

  it "leaves no live copy when a membership sync races the gym's deletion" do
    race(WorkosEvent, :deleted?,
      first: -> { deliver_workos_event("organization_membership.created", membership_data) },
      second: -> { deliver_workos_event("organization.deleted", workos_organization_data(chainsaw.workos_id)) })

    expect(chainsaw.reload.workos_deleted_at).to be_present
    expect(OrganizationMembership.sole).to have_attributes(workos_id: "om_race", workos_deleted_at: be_present)
  end

  describe "two syncs creating the same new user" do
    let(:api) { WorkosSyncHelpers::FakeWorkosApi.new }
    let(:membership) { workos_membership_data("om_new", user_id: "user_new", organization_id: chainsaw.workos_id) }

    # The first creator inserts and pauses before commit. The second misses the
    # uncommitted row, so its insert waits on the unique index, then fails.
    it "converges when the second insert hits the unique index" do
      api.users["user_new"] = workos_user_data("user_new", first_name: "Newer", updated_at: 1.minute.from_now)

      race(WorkosEvent, :finish!, any_instance: true,
        first: -> { deliver_workos_event("user.created", workos_user_data("user_new", first_name: "Older")) },
        second: -> { deliver_workos_event("organization_membership.created", membership, api:) })

      expect(WorkosEvent.order(:created_at).pluck(:event_type, :status, :outcome)).to eq([
        [ "user.created", "processed", "created" ],
        [ "organization_membership.created", "processed", "created" ]
      ])
      expect(User.where(workos_id: "user_new").sole.first_name).to eq("Newer")
      expect(OrganizationMembership.live.sole).to have_attributes(workos_id: "om_new", user: User.find_by!(workos_id: "user_new"))
    end

    # The first creator misses the user, then pauses. The second creates and
    # commits it. The first then fails the uniqueness validation.
    it "converges when the second insert fails the uniqueness validation" do
      api.users["user_new"] = workos_user_data("user_new", first_name: "Newer", updated_at: 1.minute.from_now)

      pause_first_call(User, :new) do |reached, release|
        first = in_thread { deliver_workos_event("user.created", workos_user_data("user_new", first_name: "Older")) }
        expect(reached.wait(10)).to be(true)

        second = in_thread { deliver_workos_event("organization_membership.created", membership, api:) }
        expect(second.value).not_to be_a(StandardError)
        release.set
        expect(first.value).not_to be_a(StandardError)
      end

      expect(WorkosEvent.order(:created_at).pluck(:event_type, :status, :outcome)).to eq([
        [ "user.created", "processed", "stale" ],
        [ "organization_membership.created", "processed", "created" ]
      ])
      expect(User.where(workos_id: "user_new").sole.first_name).to eq("Newer")
    end

    it "still raises for invalid user data" do
      expect { User.transaction { User.sync_from_workos!(workos_user_data("user_new", email: nil)) } }
        .to raise_error(ActiveRecord::RecordInvalid, /Email/)
    end
  end

  it "does not deadlock when reconciliations, deletions, and observations overlap" do
    api = WorkosSyncHelpers::FakeWorkosApi.new
    users = %w[user_a user_b user_c user_d].map { staff_user(_1) }
    [ chainsaw, ironworks ].each do |organization|
      api.organizations[organization.workos_id] = workos_organization_data(organization.workos_id, name: organization.name)
      users.each do |staff|
        api.users[staff.workos_id] = workos_user_data(staff.workos_id, email: staff.email)
        id = "om_#{organization.slug}_#{staff.workos_id}"
        api.memberships[id] = workos_membership_data(id, user_id: staff.workos_id, organization_id: organization.workos_id)
        organization.organization_memberships.create!(user: staff, role: "owner")
      end
    end
    # WorkOS deleted two shared users; their deletion events race the reconciliations.
    %w[user_b user_d].each { |id| api.users.delete(id) && api.memberships.delete_if { _2["user_id"] == id } }

    gate = Concurrent::CountDownLatch.new(1)
    work = [
      -> { chainsaw.reconcile_with_workos!(api:) },
      -> { ironworks.reconcile_with_workos!(api:) },
      -> { deliver_workos_event("user.deleted", workos_user_data("user_d")) },
      -> { deliver_workos_event("user.deleted", workos_user_data("user_b")) },
      -> { OrganizationMembership.observe!(organization: ironworks, user: users[2], role: "owner") },
      -> { OrganizationMembership.observe!(organization: chainsaw, user: users[0], role: "owner") }
    ]
    threads = work.map { |job| in_thread { gate.wait && job.call } }
    gate.count_down

    expect(threads.map(&:value).grep(StandardError)).to be_empty
    expect(WorkosEvent.pluck(:status)).to all(eq("processed"))
    expect(User.where(workos_id: %w[user_b user_d]).pluck(:workos_deleted_at)).to all(be_present)
    expect(OrganizationMembership.live.joins(:user).pluck("users.workos_id").uniq).to contain_exactly("user_a", "user_c")
  end
end
