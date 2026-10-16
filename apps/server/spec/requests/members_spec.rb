require "rails_helper"

RSpec.describe "Members" do
  before { chainsaw && demo_user }

  it "creates a member without a login" do
    api :post, "/staff/members", body: { name: "  Aisyah   Rahman ", email: " Aisyah@Example.COM " }

    expect(response).to have_http_status(:created)
    expect(data).to include("name" => "Aisyah Rahman", "email" => "aisyah@example.com")
    expect(Member.find(data["id"])).to have_attributes(organization: chainsaw, user: nil)
  end

  it "rejects invalid and duplicate members" do
    create_member(chainsaw, email: "ben@example.com")

    api :post, "/staff/members", body: { name: "", email: "not-an-email" }
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details").keys).to match_array(%w[name email])

    api :post, "/staff/members", body: { name: "Ben", email: "BEN@example.com" }
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "email")).to eq([ "is already used by another member" ])
  end

  it "allows the same email in another organization" do
    create_member(ironworks, email: "shared@example.com")

    api :post, "/staff/members", body: { name: "Shared", email: "shared@example.com" }

    expect(response).to have_http_status(:created)
  end

  it "rejects malformed JSON" do
    api :post, "/staff/members", body: "{not json"

    expect(response).to have_http_status(:bad_request)
    expect(error_code).to eq("bad_request")
  end

  it "searches members by name or email" do
    create_member(chainsaw, name: "Chloe Lim", email: "chloe@example.com")
    create_member(chainsaw, name: "Ben Tan", email: "ben@example.com")

    api :get, "/staff/members?q=CHLOE"

    expect(data.map { _1["name"] }).to eq([ "Chloe Lim" ])
  end

  it "shows membership periods and current rights" do
    location = create_location(chainsaw)
    member = create_member(chainsaw)
    sale = grant_access(chainsaw, member:, location:, usage_limit: 8)

    api :get, "/staff/members/#{member.id}"

    expect(response).to have_http_status(:ok)
    period = data["membership"]["periods"].sole
    expect(period).to include("sale_id" => sale.id, "fulfillment_id" => sale.fulfillment.id)
    expect(data["current_period"]["id"]).to eq(period["id"])
    expect(data["entitlements"].sole).to include("usage_limit" => 8, "used_count" => 0, "remaining" => 8, "active" => true)
  end

  it "shows an empty member without membership" do
    member = create_member(chainsaw)

    api :get, "/staff/members/#{member.id}"

    expect(data).to include("membership" => nil, "current_period" => nil, "entitlements" => [])
  end

  it "returns 404 for a malformed id" do
    api :get, "/staff/members/not-a-uuid"

    expect(response).to have_http_status(:not_found)
  end
end
