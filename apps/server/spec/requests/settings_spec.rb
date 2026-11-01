require "rails_helper"

RSpec.describe "Organization settings and locations" do
  before { chainsaw && demo_user }

  it "changes the time zone and publication, but never the name or currency" do
    api :patch, "/staff/organization", body: { timezone: "Asia/Singapore", published: false, name: "Hacked", currency: "USD" }

    expect(response).to have_http_status(:ok)
    expect(data).to include("timezone" => "Asia/Singapore", "published" => false, "name" => "Chainsaw", "currency" => "MYR")

    api :get, "/public/organization", token: nil
    expect(response).to have_http_status(:not_found)
  end

  it "rejects an unknown time zone" do
    api :patch, "/staff/organization", body: { timezone: "Mars/Olympus" }

    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "timezone")).to eq([ "is not a known time zone" ])
  end

  it "adds and renames locations, with unique names per organization" do
    api :post, "/staff/locations", body: { name: "  Mont   Kiara ", address: "1 Jalan Kiara" }
    expect(response).to have_http_status(:created)
    expect(data).to include("name" => "Mont Kiara", "address" => "1 Jalan Kiara")
    id = data["id"]

    api :post, "/staff/locations", body: { name: "Mont Kiara" }
    expect(json.dig("error", "details", "name")).to eq([ "has already been taken" ])

    api :patch, "/staff/locations/#{id}", body: { name: "Mont Kiara 2", address: "" }
    expect(data).to include("name" => "Mont Kiara 2", "address" => nil)

    api :get, "/staff/organization"
    expect(data["locations"].map { _1["name"] }).to include("Mont Kiara 2")
  end

  it "keeps other organizations' locations out of reach" do
    foreign = create_location(ironworks, name: "Penang")

    api :patch, "/staff/locations/#{foreign.id}", body: { name: "Hacked" }

    expect(response).to have_http_status(:not_found)
    expect(foreign.reload.name).to eq("Penang")
  end

  describe "permissions", workos: true, demo: false do
    let(:token) { workos_token(workos_claims(user: staff_user("user_desk"), organization: chainsaw, permissions: %w[members:read])) }

    it "needs settings:manage" do
      api :patch, "/staff/organization", token: token, body: { published: false }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/locations", token: token, body: { name: "New" }
      expect(response).to have_http_status(:forbidden)
      api :patch, "/staff/locations/#{create_location(chainsaw).id}", token: token, body: { name: "X" }
      expect(response).to have_http_status(:forbidden)
      expect(chainsaw.reload.published).to be(true)
    end
  end
end
