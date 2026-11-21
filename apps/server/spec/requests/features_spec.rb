require "rails_helper"

RSpec.describe "Feature flags", workos: true, demo: false do
  let(:owner_permissions) { %w[members:read settings:manage staff:manage] }
  let(:developer_permissions) { owner_permissions + %w[features:manage] }
  let(:developer) { staff_user("user_developer") }
  let(:owner) { staff_user("user_owner") }
  let(:desk) { staff_user("user_desk") }
  let(:person) { staff_user("user_mei", email: "mei.login@example.com") }

  before do
    chainsaw && ironworks
    chainsaw.members.create!(name: "Mei Lim", email: "mei@example.com", user: person)
  end

  def token_for(user, permissions, organization: chainsaw) = workos_token(workos_claims(user:, organization:, permissions:))
  def as_developer = { token: token_for(developer, developer_permissions) }
  def as_owner = { token: token_for(owner, owner_permissions) }
  def member_token = workos_token(workos_claims(user: person, organization: nil))

  def set_state(state, **as)
    api :patch, "/staff/features/gym_site", **as_developer, **as, body: { state: }
  end

  def gym_site_status
    api :get, "/public/organization", token: nil
    public_status = response.status
    api :get, "/member/profile", token: member_token
    [ public_status, response.status ]
  end

  def staff_organization(**as)
    api :get, "/staff/organization", **as_owner, **as
    data
  end

  it "lists every feature with its state and the WorkOS organization ID" do
    api :get, "/staff/features", **as_developer

    expect(response).to have_http_status(:ok)
    expect(data["workos_organization_id"]).to eq(chainsaw.workos_id)
    expect(data["features"]).to eq([
      { "key" => "gym_site", "name" => "Gym site", "description" => Feature::LIST.dig("gym_site", :description),
        "state" => "on", "enabled" => false, "in_effect" => true }
    ])
  end

  it "lists a feature with no saved state as Off" do
    fresh = create_organization(slug: "fresh", published: false)

    api :get, "/staff/features", organization: "fresh", token: token_for(developer, developer_permissions, organization: fresh)

    expect(data["features"].sole).to include("key" => "gym_site", "state" => "off", "in_effect" => false)
    expect(fresh.features).to be_empty
  end

  it "hides the gym site when Off, offers it in Labs, and serves it when On" do
    expect(gym_site_status).to eq([ 200, 200 ])
    expect(staff_organization).to include("features" => [ "gym_site" ], "labs" => [])

    set_state "off"
    expect(response).to have_http_status(:ok)
    expect(data["features"].sole).to include("state" => "off", "in_effect" => false)
    expect(gym_site_status).to eq([ 404, 404 ])
    expect(staff_organization).to include("features" => [], "labs" => [])

    set_state "labs"
    expect(gym_site_status).to eq([ 404, 404 ])
    expect(staff_organization["labs"]).to eq([
      { "key" => "gym_site", "name" => "Gym site", "description" => Feature::LIST.dig("gym_site", :description), "enabled" => false }
    ])

    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: true }
    expect(response).to have_http_status(:ok)
    expect(data).to include("key" => "gym_site", "enabled" => true)
    expect(gym_site_status).to eq([ 200, 200 ])
    expect(staff_organization).to include("features" => [ "gym_site" ])

    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: false }
    expect(data["enabled"]).to be(false)
    expect(gym_site_status).to eq([ 404, 404 ])

    set_state "on"
    expect(gym_site_status).to eq([ 200, 200 ])
    expect(staff_organization).to include("features" => [ "gym_site" ], "labs" => [])
  end

  it "keeps published as the owner's switch while the feature is in effect" do
    chainsaw.update!(published: false)

    api :get, "/public/organization", token: nil
    expect(response).to have_http_status(:not_found)
  end

  it "clears the Labs choice when the feature leaves Labs" do
    set_state "labs"
    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: true }

    set_state "on"
    set_state "labs"

    expect(data["features"].sole).to include("state" => "labs", "enabled" => false, "in_effect" => false)
    expect(gym_site_status).to eq([ 404, 404 ])
  end

  it "turns on only a feature that is in Labs" do
    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: true }
    expect(response).to have_http_status(:not_found)

    set_state "off"
    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: true }
    expect(response).to have_http_status(:not_found)
    expect(gym_site_status).to eq([ 404, 404 ])
  end

  it "refuses an unknown feature, an unknown state, and a value that is not true or false" do
    api :patch, "/staff/features/agent", **as_developer, body: { state: "on" }
    expect(response).to have_http_status(:not_found)

    set_state "everywhere"
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "state")).to eq([ "is not included in the list" ])

    set_state "labs"
    api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: "yes" }
    expect(response).to have_http_status(:bad_request)
    expect(chainsaw.features.sole).to have_attributes(state: "labs", enabled: false)
  end

  describe "permissions" do
    it "lets only features:manage list and set states" do
      api :get, "/staff/features", **as_owner
      expect(response).to have_http_status(:forbidden)

      api :patch, "/staff/features/gym_site", **as_owner, body: { state: "off" }
      expect(response).to have_http_status(:forbidden)
      expect(chainsaw.feature?(:gym_site)).to be(true)
    end

    it "lets only settings:manage turn a Labs feature on" do
      set_state "labs"

      api :patch, "/staff/labs/gym_site", token: token_for(desk, %w[members:read]), body: { enabled: true }

      expect(response).to have_http_status(:forbidden)
      expect(chainsaw.feature?(:gym_site)).to be(false)
    end
  end

  describe "another organization" do
    it "never reads or changes another organization's features" do
      ironworks.change_feature!("gym_site", state: "labs")

      api :get, "/staff/features", organization: "ironworks", **as_developer
      expect(response).to have_http_status(:forbidden)
      api :patch, "/staff/features/gym_site", organization: "ironworks", **as_developer, body: { state: "on" }
      expect(response).to have_http_status(:forbidden)
      api :patch, "/staff/labs/gym_site", organization: "ironworks", **as_owner, body: { enabled: true }
      expect(response).to have_http_status(:forbidden)

      set_state "off"
      expect(ironworks.features.sole).to have_attributes(state: "labs", enabled: false)
      expect(chainsaw.features.sole.state).to eq("off")
    end

    it "keeps a Labs choice in its own organization" do
      ironworks.change_feature!("gym_site", state: "labs")
      set_state "labs"

      api :patch, "/staff/labs/gym_site", **as_owner, body: { enabled: true }

      expect(chainsaw.feature?(:gym_site)).to be(true)
      expect(ironworks.feature?(:gym_site)).to be(false)
      expect(Organization.with_feature(:gym_site)).to contain_exactly(chainsaw)
    end
  end
end
