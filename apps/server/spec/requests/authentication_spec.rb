require "rails_helper"

RSpec.describe "Authentication and permissions" do
  before { chainsaw && demo_user }

  describe "staff area" do
    it "accepts the demo token for the demo organization" do
      create_location(chainsaw, name: "Bangsar")

      api :get, "/staff/organization"

      expect(response).to have_http_status(:ok)
      expect(data["slug"]).to eq("chainsaw")
      expect(data["locations"].map { _1["name"] }).to eq([ "Bangsar" ])
      expect(data["actor"]).to include("demo" => true, "email" => "demo.owner@flowfokus.test")
      expect(data["actor"]["permissions"]).to match_array(Flowfokus::DemoIdentity::PERMISSIONS)
      expect(response.headers["Cache-Control"]).to include("no-store")
    end

    it "returns 401 without a token" do
      api :get, "/staff/organization", token: nil

      expect(response).to have_http_status(:unauthorized)
      expect(error_code).to eq("unauthenticated")
    end

    it "returns 401 for another token in demo mode" do
      api :get, "/staff/organization", token: "not-the-demo-token-at-all"

      expect(response).to have_http_status(:unauthorized)
      expect(error_code).to eq("invalid_token")
    end

    it "requires the organization header" do
      api :get, "/staff/organization", organization: nil

      expect(response).to have_http_status(:bad_request)
      expect(error_code).to eq("organization_required")
    end

    it "returns 404 for an unknown organization" do
      api :get, "/staff/organization", organization: "nowhere"

      expect(response).to have_http_status(:not_found)
    end

    it "rejects the demo token for another organization" do
      ironworks

      api :get, "/staff/members", organization: "ironworks"

      expect(response).to have_http_status(:forbidden)
      expect(error_code).to eq("organization_mismatch")
    end

    it "explains when the demo user is not seeded" do
      demo_user.destroy!

      api :get, "/staff/organization"

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_unavailable")
    end

    context "without demo mode or WorkOS", demo: false do
      it "fails closed with 503 for any token" do
        api :get, "/staff/organization", token: EnvHelpers::DEMO_TOKEN

        expect(response).to have_http_status(:service_unavailable)
        expect(error_code).to eq("auth_not_configured")
      end

      it "still returns 401 without a token" do
        api :get, "/staff/organization", token: nil

        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with WorkOS configured but not verified yet", demo: false, workos: true do
      it "fails closed with 503 instead of trusting the token" do
        api :get, "/staff/organization", token: "eyJhbGciOiJSUzI1NiJ9.fake.token"

        expect(response).to have_http_status(:service_unavailable)
        expect(error_code).to eq("auth_unavailable")
      end
    end

    context "when demo mode is requested in production" do
      it "never authenticates the demo token" do
        allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("production"))

        api :get, "/staff/organization"

        expect(response).to have_http_status(:service_unavailable)
        expect(error_code).to eq("auth_not_configured")
      end
    end

    context "with limited permissions" do
      before do
        claims = Flowfokus::IdentityClaims.new(
          user_workos_id: demo_user.workos_id, organization_workos_id: chainsaw.workos_id,
          permissions: %w[members:read], demo: true
        )
        allow(Flowfokus::DemoIdentity).to receive(:claims_for).and_return(claims)
      end

      it "allows granted permissions" do
        api :get, "/staff/members"

        expect(response).to have_http_status(:ok)
      end

      it "returns 403 for missing permissions and writes nothing" do
        expect {
          api :post, "/staff/members", body: { name: "Eve", email: "eve@example.test" }
        }.not_to change(Member, :count)

        expect(response).to have_http_status(:forbidden)
        expect(error_code).to eq("forbidden")
        expect(json.dig("error", "message")).to include("members:create")
      end

      it "protects every write" do
        location = create_location(chainsaw)
        member = create_member(chainsaw)
        price = create_offer(chainsaw)
        sale = record_sale(chainsaw, member:, price:, location:)

        api :post, "/staff/sales", key: SecureRandom.uuid, body: { member_id: member.id, price_id: price.id, location_id: location.id }
        expect(response).to have_http_status(:forbidden)
        api :post, "/staff/sales/#{sale.id}/payments", key: SecureRandom.uuid, body: { amount_minor: 100, method: "cash" }
        expect(response).to have_http_status(:forbidden)
        api :post, "/staff/sales/#{sale.id}/fulfill"
        expect(response).to have_http_status(:forbidden)
        api :post, "/staff/check_ins", key: SecureRandom.uuid, body: { member_id: member.id, location_id: location.id }
        expect(response).to have_http_status(:forbidden)
        api :get, "/staff/products"
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "member area" do
    it "returns 401 without a token" do
      api :get, "/member/profile", token: nil

      expect(response).to have_http_status(:unauthorized)
    end

    it "never grants member access to the demo staff actor" do
      api :get, "/member/profile"

      expect(response).to have_http_status(:forbidden)
      expect(error_code).to eq("forbidden")
    end

    it "fails closed with WorkOS configured", demo: false, workos: true do
      api :get, "/member/profile", token: "eyJhbGciOiJSUzI1NiJ9.fake.token"

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_unavailable")
    end

    it "fails closed with nothing configured", demo: false do
      api :get, "/member/profile", token: "some-member-token"

      expect(response).to have_http_status(:service_unavailable)
      expect(error_code).to eq("auth_not_configured")
    end
  end
end
