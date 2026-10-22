require "rails_helper"

RSpec.describe "Organization#reconcile_with_workos!" do
  let(:api) { WorkosSyncHelpers::FakeWorkosApi.new }
  let(:org_id) { chainsaw.workos_id }

  before do
    api.organizations[org_id] = workos_organization_data(org_id, name: "Chainsaw Gym", updated_at: 1.hour.ago)
    api.users["user_owner"] = workos_user_data("user_owner", email: "owner@example.test", updated_at: 1.hour.ago)
    api.users["user_desk"] = workos_user_data("user_desk", email: "desk@example.test", updated_at: 1.hour.ago)
    api.memberships["om_owner"] = workos_membership_data("om_owner", user_id: "user_owner", organization_id: org_id, updated_at: 1.hour.ago)
    api.memberships["om_desk"] = workos_membership_data("om_desk", user_id: "user_desk", organization_id: org_id,
      role: "receptionist", status: "inactive", updated_at: 1.hour.ago)
  end

  it "imports the gym's users and memberships, and is safe to repeat" do
    chainsaw.update!(published: true)
    first = chainsaw.reconcile_with_workos!(api:)

    expect(first).to include(organization_updated: 1, user_created: 2, membership_created: 2)
    expect(chainsaw.reload).to have_attributes(name: "Chainsaw Gym", slug: "chainsaw", published: true)
    expect(chainsaw.workos_synced_at).to be_present
    expect(chainsaw.organization_memberships.live.map { [ _1.user.email, _1.role, _1.status ] }).to contain_exactly(
      [ "owner@example.test", "owner", "active" ], [ "desk@example.test", "receptionist", "inactive" ])

    second = chainsaw.reconcile_with_workos!(api:)
    expect(second).to eq(organization_unchanged: 1, user_unchanged: 2, membership_unchanged: 2)
    expect(OrganizationMembership.count).to eq(2)
  end

  it "adopts copies written before sync and removes copies WorkOS no longer has" do
    owner = staff_user("user_owner", email: "owner@example.test")
    former = staff_user("user_former")
    seeded = chainsaw.organization_memberships.create!(user: owner, role: "member")
    stale = chainsaw.organization_memberships.create!(user: former, role: "owner")

    summary = chainsaw.reconcile_with_workos!(api:)

    expect(summary).to include(membership_deleted: 1, membership_updated: 1, membership_created: 1)
    expect(seeded.reload).to have_attributes(workos_id: "om_owner", role: "owner")
    expect(stale.reload.workos_deleted_at).to be_present
    expect(former.reload.workos_deleted_at).to be_nil
  end

  it "changes nothing when any fetch fails" do
    staff_user("user_former").then { chainsaw.organization_memberships.create!(user: _1, role: "owner") }
    api.fail_on = :organization_memberships

    expect { chainsaw.reconcile_with_workos!(api:) }.to raise_error(Flowfokus::WorkosApi::Unavailable)

    expect(User.where(workos_id: %w[user_owner user_desk])).to be_empty
    expect(chainsaw.organization_memberships.live.count).to eq(1)
    expect(chainsaw.reload.workos_synced_at).to be_nil
  end

  it "does not overwrite data that a newer webhook applied" do
    deliver_workos_event("organization_membership.updated",
      workos_membership_data("om_owner", user_id: "user_owner", organization_id: org_id, role: "receptionist"), api:)

    summary = chainsaw.reconcile_with_workos!(api:)

    expect(summary).to include(membership_stale: 1)
    expect(OrganizationMembership.find_by!(workos_id: "om_owner").role).to eq("receptionist")
  end

  it "skips memberships that name another organization" do
    ironworks
    api.memberships["om_cross"] = workos_membership_data("om_cross", user_id: "user_owner", organization_id: org_id)
      .merge("organization_id" => ironworks.workos_id)
    allow(api).to receive(:organization_memberships).and_return(api.memberships.values)

    summary = chainsaw.reconcile_with_workos!(api:)

    expect(summary).to include(membership_wrong_organization: 1)
    expect(ironworks.organization_memberships).to be_empty
  end

  it "fetches a member's user when the user list misses it, and records deleted users" do
    api.memberships["om_ghost"] = workos_membership_data("om_ghost", user_id: "user_ghost", organization_id: org_id)
    staff_user("user_ghost")
    allow(api).to receive(:organization_users).and_return([ api.users["user_owner"] ])

    summary = chainsaw.reconcile_with_workos!(api:)

    expect(summary).to include(user_deleted: 1, membership_user_deleted: 1)
    expect(User.find_by!(workos_id: "user_desk").email).to eq("desk@example.test")
    expect(User.find_by!(workos_id: "user_ghost").workos_deleted_at).to be_present
  end

  it "marks the gym deleted when WorkOS no longer has the organization" do
    api.organizations.clear

    expect(chainsaw.reconcile_with_workos!(api:)).to eq(organization_deleted: 1)
    expect(chainsaw.reload.workos_deleted_at).to be_present
    expect(Organization.linked_to_workos).not_to include(chainsaw)
  end
end

RSpec.describe Flowfokus::WorkosApi do
  subject(:client) { described_class.new(api_key: "sk_test_x", base_url: "http://workos:4100") }

  it "reads every page before returning" do
    pages = [
      { "data" => [ { "id" => "a" } ], "list_metadata" => { "after" => "a" } },
      { "data" => [ { "id" => "b" } ], "list_metadata" => { "after" => nil } }
    ]
    allow(client).to receive(:get).and_return(*pages)

    expect(client.organization_memberships("org_1").map { _1["id"] }).to eq(%w[a b])
    expect(client).to have_received(:get).with("/user_management/organization_memberships",
      organization_id: "org_1", statuses: "active,inactive,pending", limit: 100, order: "asc", after: nil)
    expect(client).to have_received(:get).with(anything, hash_including(after: "a"))
  end

  it "raises instead of looping on a repeated cursor" do
    allow(client).to receive(:get).and_return({ "data" => [], "list_metadata" => { "after" => "same" } })

    expect { client.organization_users("org_1") }.to raise_error(described_class::Error, /repeated/)
  end

  it "raises on a malformed page" do
    allow(client).to receive(:get).and_return({ "list_metadata" => {} })

    expect { client.organization_users("org_1") }.to raise_error(described_class::Error)
  end

  it "uses only the official HTTPS API in production, after verification" do
    production = { rails_env: "production" }
    expect { described_class.from_env(env: { "WORKOS_API_KEY" => "sk", "WORKOS_API_BASE_URL" => "http://workos:4100", "WORKOS_VERIFIED" => "true" }, **production) }
      .to raise_error(described_class::Unavailable, /api.workos.com/)
    expect { described_class.from_env(env: { "WORKOS_API_KEY" => "sk" }, **production) }
      .to raise_error(described_class::Unavailable, /not verified/)
    expect(described_class.from_env(env: { "WORKOS_API_KEY" => "sk", "WORKOS_VERIFIED" => "true" }, **production).base_url)
      .to eq("https://api.workos.com")
    expect(described_class.from_env(env: { "WORKOS_API_KEY" => "sk", "WORKOS_API_BASE_URL" => "http://workos:4100/" }, rails_env: "development").base_url)
      .to eq("http://workos:4100")
    expect { described_class.from_env(env: {}, rails_env: "development") }.to raise_error(described_class::Unavailable, /WORKOS_API_KEY/)
  end
end

RSpec.describe Flowfokus::WorkosWebhooks do
  let(:secret) { WorkosSyncHelpers::WEBHOOK_SECRET }
  let(:body) { '{"id":"event_1"}' }

  it "accepts the emulator's header format" do
    timestamp = (Time.current.to_f * 1000).to_i.to_s
    signature = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{body}")

    expect(described_class.verify!(body, "t=#{timestamp}, v1=#{signature}", secret:)).to be(true)
  end

  it "accepts any matching v1 signature during secret rotation" do
    header = described_class.sign(body, secret:)
    other = described_class.sign(body, secret: "whsec_previous_secret_value").split("v1=").last

    expect(described_class.verify!(body, "#{header}, v1=#{other}", secret:)).to be(true)
  end

  it "rejects timestamps outside three minutes in either direction" do
    [ 4.minutes.ago, 4.minutes.from_now ].each do |at|
      expect { described_class.verify!(body, described_class.sign(body, secret:, at:), secret:) }
        .to raise_error(described_class::InvalidSignature, /window/)
    end
    expect(described_class.verify!(body, described_class.sign(body, secret:, at: 2.minutes.ago), secret:)).to be(true)
  end

  it "rejects malformed headers" do
    [ nil, "", "t=abc, v1=#{'a' * 64}", "t=1", "v1=#{'a' * 64}", "t=1, v1=short" ].each do |header|
      expect { described_class.verify!(body, header, secret:) }.to raise_error(described_class::InvalidSignature)
    end
  end

  it "needs a secret of useful length" do
    expect { described_class.secret!(env: {}) }.to raise_error(described_class::Unavailable)
    expect { described_class.secret!(env: { "WORKOS_WEBHOOK_SECRET" => "short" }) }.to raise_error(described_class::Unavailable)
    expect(described_class.secret!(env: { "WORKOS_WEBHOOK_SECRET" => secret })).to eq(secret)
  end
end
