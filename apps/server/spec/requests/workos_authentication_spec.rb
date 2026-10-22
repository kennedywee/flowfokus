require "rails_helper"

RSpec.describe "WorkOS access tokens", workos: true, demo: false do
  let(:owner) { staff_user("user_chainsaw_owner") }
  let(:receptionist) { staff_user("user_chainsaw_receptionist") }
  let(:owner_permissions) { Flowfokus::DemoIdentity::PERMISSIONS }
  let(:receptionist_permissions) { %w[members:read products:read purchases:read check_ins:read check_ins:create] }

  def token_for(user, organization: chainsaw, **overrides)
    workos_token(workos_claims(user:, organization:, **overrides))
  end

  describe "a valid token" do
    it "opens the organization named by the token" do
      create_location(chainsaw, name: "Bangsar")

      api :get, "/staff/organization", token: token_for(owner, permissions: owner_permissions)

      expect(response).to have_http_status(:ok)
      expect(data["slug"]).to eq("chainsaw")
      expect(data["actor"]).to include("demo" => false, "email" => owner.email)
      expect(data["actor"]["permissions"]).to match_array(owner_permissions)
      expect(response.headers["Cache-Control"]).to eq("private, no-store")
    end

    it "records the verified membership in the synced copy" do
      api :get, "/staff/organization", token: token_for(receptionist, role: "receptionist", permissions: receptionist_permissions)

      membership = chainsaw.organization_memberships.find_by!(user: receptionist)
      expect(membership).to have_attributes(role: "receptionist", status: "active")
    end

    it "accepts a token without aud or client_id claims" do
      token = workos_token(workos_claims(user: owner, organization: chainsaw, permissions: owner_permissions).except("aud", "client_id"))

      api :get, "/staff/organization", token: token

      expect(response).to have_http_status(:ok)
    end

    it "accepts an audience list that names this client" do
      api :get, "/staff/organization", token: token_for(owner, aud: [ "other", WorkosHelpers::CLIENT_ID ])

      expect(response).to have_http_status(:ok)
    end
  end

  describe "rejected tokens" do
    def expect_invalid_token(token)
      api :get, "/staff/organization", token: token

      expect(response).to have_http_status(:unauthorized)
      expect(error_code).to eq("invalid_token")
    end

    it("rejects an expired token") { expect_invalid_token(token_for(owner, exp: 1.minute.ago.to_i)) }
    it("rejects a token issued in the future") { expect_invalid_token(token_for(owner, iat: 5.minutes.from_now.to_i)) }
    it("rejects another issuer") { expect_invalid_token(token_for(owner, iss: "https://evil.example/user_management/#{WorkosHelpers::CLIENT_ID}")) }
    it("rejects the emulator issuer when not configured") { expect_invalid_token(token_for(owner, iss: "http://localhost:4100/user_management/#{WorkosHelpers::CLIENT_ID}")) }
    it("rejects another audience") { expect_invalid_token(token_for(owner, aud: "client_other")) }
    it("rejects another client_id") { expect_invalid_token(token_for(owner, client_id: "client_other")) }
    it("rejects a token without a session id") { expect_invalid_token(workos_token(workos_claims(user: owner, organization: chainsaw).except("sid"))) }
    it("rejects a token without expiry") { expect_invalid_token(workos_token(workos_claims(user: owner, organization: chainsaw).except("exp"))) }
    it("rejects a key that is not in the JWKS") { expect_invalid_token(workos_token(workos_claims(user: owner, organization: chainsaw), key: WorkosHelpers.other_key)) }
    it("rejects a wrong key under a known kid") { expect_invalid_token(workos_token(workos_claims(user: owner, organization: chainsaw), key: WorkosHelpers.other_key, kid: WorkosHelpers::KID)) }
    it("rejects garbage") { expect_invalid_token("not.a.jwt") }

    it "rejects an unsigned token" do
      expect_invalid_token(JWT.encode(workos_claims(user: owner, organization: chainsaw), nil, "none"))
    end

    it "rejects HS256 signed with the public key" do
      public_pem = WorkosHelpers.signing_key.public_key.to_pem
      expect_invalid_token(JWT.encode(workos_claims(user: owner, organization: chainsaw), public_pem, "HS256", { kid: WorkosHelpers::KID }))
    end

    it "rejects a payload changed after signing" do
      header, _payload, signature = token_for(owner, permissions: %w[members:read]).split(".")
      forged = Base64.urlsafe_encode64(workos_claims(user: owner, organization: chainsaw, permissions: owner_permissions).to_json, padding: false)

      expect_invalid_token([ header, forged, signature ].join("."))
    end

    it "never lets the demo token through when demo mode is off" do
      expect_invalid_token(EnvHelpers::DEMO_TOKEN)
    end
  end

  describe "JWKS" do
    it "refetches once when WorkOS rotates its key" do
      stub_workos_jwks(WorkosHelpers.public_jwk(WorkosHelpers.other_key, kid: "old_key"))
      api :get, "/staff/organization", token: workos_token(workos_claims(user: owner, organization: chainsaw), key: WorkosHelpers.other_key, kid: "old_key")
      expect(response).to have_http_status(:ok)

      travel 1.minute do
        stub_workos_jwks(WorkosHelpers.public_jwk)
        api :get, "/staff/organization", token: token_for(owner)
      end

      expect(response).to have_http_status(:ok)
      # The first load, then one refetch for the new kid.
      expect(Flowfokus::WorkosTokens::Jwks).to have_received(:download).twice
    end

    it "does not refetch for every unknown kid" do
      2.times do
        api :get, "/staff/organization", token: workos_token(workos_claims(user: owner, organization: chainsaw), key: WorkosHelpers.other_key, kid: "forged_#{SecureRandom.hex(2)}")
        expect(response).to have_http_status(:unauthorized)
      end

      expect(Flowfokus::WorkosTokens::Jwks).to have_received(:download).once
    end

    it "fails closed with 503 when the JWKS is unreachable" do
      allow(Flowfokus::WorkosTokens::Jwks).to receive(:download).and_raise(Flowfokus::WorkosTokens::Unavailable, "The WorkOS JWKS is not reachable.")

      api :get, "/staff/organization", token: token_for(owner)

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_unavailable")
    end

    it "uses the configured issuer and JWKS URL" do
      issuer = "http://localhost:4100/user_management/#{WorkosHelpers::CLIENT_ID}"
      with_env("WORKOS_ISSUER" => issuer, "WORKOS_JWKS_URL" => "http://workos:4100/sso/jwks/#{WorkosHelpers::CLIENT_ID}") do
        api :get, "/staff/organization", token: token_for(owner, iss: issuer)
      end

      expect(response).to have_http_status(:ok)
      expect(Flowfokus::WorkosTokens::Jwks).to have_received(:download).with("http://workos:4100/sso/jwks/#{WorkosHelpers::CLIENT_ID}")
    end
  end

  describe "organization and permissions" do
    it "refuses a token for another organization" do
      ironworks

      api :get, "/staff/members", organization: "ironworks", token: token_for(owner, permissions: owner_permissions)

      expect(response).to have_http_status(:forbidden)
      expect(error_code).to eq("organization_mismatch")
    end

    it "refuses a token without an organization" do
      api :get, "/staff/organization", token: token_for(owner, org_id: nil)

      expect(response).to have_http_status(:forbidden)
      expect(error_code).to eq("organization_mismatch")
    end

    it "ignores a forged organization header" do
      ironworks
      api :get, "/staff/members", organization: "ironworks", token: token_for(owner, permissions: owner_permissions),
        headers: { "Flowfokus-Organization" => "ironworks" }

      expect(response).to have_http_status(:forbidden)
    end

    it "lets a receptionist read and check in, but not sell or create members" do
      location = create_location(chainsaw)
      member = create_member(chainsaw)
      price = create_offer(chainsaw)
      token = token_for(receptionist, role: "receptionist", permissions: receptionist_permissions)

      api :get, "/staff/members", token: token
      expect(response).to have_http_status(:ok)

      expect {
        api :post, "/staff/members", token:, body: { name: "Eve", email: "eve@example.test" }
      }.not_to change(Member, :count)
      expect(response).to have_http_status(:forbidden)

      expect {
        api :post, "/staff/sales", token:, key: SecureRandom.uuid, body: { member_id: member.id, price_id: price.id, location_id: location.id }
      }.not_to change(Sale, :count)
      expect(response).to have_http_status(:forbidden)

      api :post, "/staff/check_ins", token:, key: SecureRandom.uuid, body: { member_id: member.id, location_id: location.id }
      expect(response).to have_http_status(:created)
    end

    it "cannot reach another organization's records with its own token" do
      other_owner = staff_user("user_ironworks_owner")
      chainsaw_member = create_member(chainsaw)
      ironworks_token = token_for(other_owner, organization: ironworks, permissions: owner_permissions)

      api :get, "/staff/members/#{chainsaw_member.id}", organization: "ironworks", token: ironworks_token

      expect(response).to have_http_status(:not_found)
    end

    it "explains when the user has no local record" do
      ghost = User.new(workos_id: "user_not_synced")

      api :get, "/staff/organization", token: workos_token(workos_claims(user: ghost, organization: chainsaw))

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_unavailable")
    end
  end

  describe "GET /staff/memberships" do
    let(:manager) { staff_user("user_multi_org") }

    before do
      chainsaw.organization_memberships.create!(user: manager, role: "owner")
      ironworks.organization_memberships.create!(user: manager, role: "receptionist")
      create_organization(slug: "former").organization_memberships.create!(user: manager, role: "owner", status: "inactive")
    end

    it "lists the active organizations of the token's user, without an organization header" do
      api :get, "/staff/memberships", organization: nil, token: token_for(manager)

      expect(response).to have_http_status(:ok)
      expect(data).to eq([
        { "slug" => "chainsaw", "name" => "Chainsaw", "workos_organization_id" => chainsaw.workos_id, "role" => "owner" },
        { "slug" => "ironworks", "name" => "Ironworks", "workos_organization_id" => ironworks.workos_id, "role" => "receptionist" }
      ])
    end

    it "adds the token's organization when the synced copy does not have it yet" do
      api :get, "/staff/memberships", organization: nil, token: token_for(receptionist, role: "receptionist")

      expect(data.map { _1["slug"] }).to eq([ "chainsaw" ])
    end

    it "needs a valid token" do
      api :get, "/staff/memberships", organization: nil, token: nil
      expect(response).to have_http_status(:unauthorized)

      api :get, "/staff/memberships", organization: nil, token: token_for(manager, exp: 1.minute.ago.to_i)
      expect(response).to have_http_status(:unauthorized)
    end

    it "lists only the demo organization for the demo token", demo: true do
      demo_user
      chainsaw.organization_memberships.create!(user: demo_user, role: "owner")
      ironworks.organization_memberships.create!(user: demo_user, role: "owner")

      api :get, "/staff/memberships", organization: nil

      expect(response).to have_http_status(:ok)
      expect(data.map { _1["slug"] }).to eq([ "chainsaw" ])
    end

    it "fails closed with 503 when nothing is configured", workos: false do
      api :get, "/staff/memberships", organization: nil, token: "anything-at-all-here"

      expect(response).to have_http_status(:service_unavailable)
    end
  end

  describe "demo mode alongside WorkOS", demo: true do
    it "still accepts the demo token and a WorkOS token" do
      chainsaw && demo_user
      api :get, "/staff/organization"
      expect(data["actor"]["demo"]).to be(true)

      api :get, "/staff/organization", token: token_for(owner)
      expect(data["actor"]["demo"]).to be(false)
    end
  end

  describe "member area" do
    it "never grants member access through a staff token" do
      api :get, "/member/profile", token: token_for(owner, permissions: owner_permissions)

      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "production" do
    before { allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("production")) }

    it "fails closed until WorkOS is verified" do
      api :get, "/staff/organization", token: token_for(owner)

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_unavailable")
    end

    it "accepts real WorkOS settings once verified" do
      with_env("WORKOS_VERIFIED" => "true") { api :get, "/staff/organization", token: token_for(owner) }

      expect(response).to have_http_status(:ok)
    end

    it "refuses the local emulator settings even when marked verified" do
      issuer = "http://localhost:4100/user_management/#{WorkosHelpers::CLIENT_ID}"
      with_env("WORKOS_VERIFIED" => "true", "WORKOS_ISSUER" => issuer, "WORKOS_JWKS_URL" => "http://workos:4100/sso/jwks/x") do
        api :get, "/staff/organization", token: token_for(owner, iss: issuer)
      end

      expect(response).to have_http_status(:service_unavailable)
      expect(Flowfokus::WorkosTokens::Jwks).not_to have_received(:download)
    end
  end
end
