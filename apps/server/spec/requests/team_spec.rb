require "rails_helper"

RSpec.describe "Staff management", workos: true, demo: false do
  let(:workos) { WorkosSyncHelpers::FakeWorkosApi.new }
  let(:owner_permissions) { %w[members:read settings:manage staff:manage purchases:void] }
  let(:manager_permissions) { %w[members:read staff:manage] }
  let(:receptionist_permissions) { %w[members:read] }
  let(:owner) { staff_user("user_owner") }
  let(:manager) { staff_user("user_manager") }
  let(:receptionist) { staff_user("user_receptionist") }

  def add(user, role, id)
    data = workos_membership_data(id, user_id: user.workos_id, organization_id: chainsaw.workos_id, role:, updated_at: 1.hour.ago)
    workos.memberships[id] = data
    OrganizationMembership.transaction { OrganizationMembership.sync_from_workos!(data) }
    chainsaw.organization_memberships.live.find_by!(workos_id: id)
  end

  let!(:owner_membership) { add(owner, "owner", "om_owner") }
  let!(:manager_membership) { add(manager, "manager", "om_manager") }
  let!(:receptionist_membership) { add(receptionist, "receptionist", "om_receptionist") }

  before do
    workos.role_list = [
      { "slug" => "owner", "name" => "Owner", "permissions" => owner_permissions },
      { "slug" => "manager", "name" => "Manager", "permissions" => manager_permissions },
      { "slug" => "receptionist", "name" => "Receptionist", "permissions" => receptionist_permissions }
    ]
    allow(Flowfokus::WorkosApi).to receive(:from_env).and_return(workos)
  end

  def token_for(user, permissions) = workos_token(workos_claims(user:, organization: chainsaw, permissions:))
  def as_owner = { token: token_for(owner, owner_permissions) }
  def as_manager = { token: token_for(manager, manager_permissions) }

  it "lists members, invitations, and roles with what the actor may do" do
    api :get, "/staff/team", **as_manager

    expect(response).to have_http_status(:ok)
    members = data["members"].index_by { _1["email"] }
    expect(members["user_manager@example.test"]).to include("you" => true, "manageable" => false, "role_name" => "Manager")
    expect(members["user_owner@example.test"]).to include("manageable" => false)
    expect(members["user_receptionist@example.test"]).to include("manageable" => true)
    expect(data["roles"].to_h { [ _1["slug"], _1["grantable"] ] }).to eq("owner" => false, "manager" => true, "receptionist" => true)
  end

  it "invites with a grantable role and refuses escalation" do
    api :post, "/staff/team/invitations", **as_manager, body: { email: " New@Example.com ", role: "receptionist" }
    expect(response).to have_http_status(:created)
    expect(data["invitations"].sole).to include("email" => "new@example.com", "role" => "receptionist", "state" => "pending")
    expect(workos.invitations_by_id.values.sole["inviter_user_id"]).to eq(manager.workos_id)

    api :post, "/staff/team/invitations", **as_manager, body: { email: "boss@example.com", role: "owner" }
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("staff_change_refused")
    expect(json.dig("error", "message")).to include("settings:manage")

    api :post, "/staff/team/invitations", **as_manager, body: { email: "x@example.com", role: "astronaut" }
    expect(json.dig("error", "message")).to include("does not exist")
  end

  it "revokes a pending invitation of this organization only" do
    invitation = workos.create_invitation(email: "a@example.com", organization_id: chainsaw.workos_id, role_slug: "receptionist")
    foreign = workos.create_invitation(email: "b@example.com", organization_id: "org_other", role_slug: "receptionist")

    api :post, "/staff/team/invitations/#{foreign['id']}/revoke", **as_owner
    expect(response).to have_http_status(:not_found)

    api :post, "/staff/team/invitations/#{invitation['id']}/revoke", **as_owner
    expect(response).to have_http_status(:ok)
    expect(data["invitations"]).to be_empty
    expect(workos.invitations_by_id[invitation["id"]]["state"]).to eq("revoked")
  end

  it "changes a role in WorkOS and the local copy" do
    api :patch, "/staff/team/members/#{receptionist_membership.id}", **as_manager, body: { role: "manager" }

    expect(response).to have_http_status(:ok)
    expect(workos.memberships["om_receptionist"]["role"]).to eq("slug" => "manager")
    expect(receptionist_membership.reload.role).to eq("manager")
  end

  it "refuses self changes, changes above the actor, and losing the last manager" do
    api :patch, "/staff/team/members/#{manager_membership.id}", **as_manager, body: { role: "receptionist" }
    expect(json.dig("error", "message")).to include("your own access")

    api :delete, "/staff/team/members/#{owner_membership.id}", **as_manager
    expect(error_code).to eq("staff_change_refused")
    expect(json.dig("error", "message")).to include("settings:manage")

    workos.memberships["om_manager"]["status"] = "inactive"
    api :patch, "/staff/team/members/#{owner_membership.id}", token: token_for(staff_user("user_root"), owner_permissions), body: { role: "receptionist" }
    expect(json.dig("error", "message")).to include("At least one active member must keep staff:manage")
    expect(workos.calls).not_to include(:update_membership_role)
  end

  it "removes access in WorkOS and keeps the local history" do
    api :delete, "/staff/team/members/#{receptionist_membership.id}", **as_manager

    expect(response).to have_http_status(:ok)
    expect(workos.memberships).not_to have_key("om_receptionist")
    expect(receptionist_membership.reload).to be_workos_deleted
    expect(data["members"].map { _1["email"] }).not_to include("user_receptionist@example.test")
  end

  it "keeps other organizations' members out of reach" do
    other = create_organization(slug: "elsewhere", workos_id: "org_elsewhere")
    data = workos_membership_data("om_far", user_id: receptionist.workos_id, organization_id: other.workos_id, role: "receptionist")
    workos.memberships["om_far"] = data
    OrganizationMembership.transaction { OrganizationMembership.sync_from_workos!(data) }
    far = other.organization_memberships.live.find_by!(workos_id: "om_far")

    api :delete, "/staff/team/members/#{far.id}", **as_owner

    expect(response).to have_http_status(:not_found)
    expect(workos.memberships).to have_key("om_far")
  end

  it "needs staff:manage" do
    token = token_for(receptionist, receptionist_permissions)
    api :get, "/staff/team", token: token
    expect(response).to have_http_status(:forbidden)
    api :post, "/staff/team/invitations", token: token, body: { email: "a@example.com", role: "receptionist" }
    expect(response).to have_http_status(:forbidden)
    expect(workos.calls).to be_empty
  end

  it "answers 503 when WorkOS is down, and 422 when WorkOS refuses" do
    workos.fail_on = :roles
    api :get, "/staff/team", **as_owner
    expect(response).to have_http_status(:service_unavailable)
    expect(error_code).to eq("workos_unavailable")

    workos.fail_on = nil
    allow(workos).to receive(:create_invitation).and_raise(Flowfokus::WorkosApi::Rejected, "WorkOS refused the change: already invited")
    api :post, "/staff/team/invitations", **as_owner, body: { email: "a@example.com", role: "receptionist" }
    expect(error_code).to eq("workos_rejected")
  end
end
