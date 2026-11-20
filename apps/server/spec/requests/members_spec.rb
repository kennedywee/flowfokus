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

  it "creates a member with the optional details" do
    api :post, "/staff/members", body: { name: "Dina", email: "dina@example.com", phone: " +60 12-345 6789 ", date_of_birth: "1994-03-09" }

    expect(response).to have_http_status(:created)
    expect(Member.find(data["id"])).to have_attributes(phone: "+60 12-345 6789", date_of_birth: Date.new(1994, 3, 9))
  end

  describe "update" do
    let(:member) { create_member(chainsaw, name: "Aisyah Rahman", email: "aisyah@example.com") }
    let(:profile) do
      { "phone" => "+60 12-345 6789", "date_of_birth" => "1994-03-09", "emergency_contact_name" => "Rahman Ali",
        "emergency_contact_phone" => "(03) 5555.0101", "note" => "Knee injury. Prefers morning sessions." }
    end

    it "changes the name, email, and optional details" do
      api :patch, "/staff/members/#{member.id}",
        body: profile.merge("name" => " Aisyah  Binti Rahman ", "email" => " Aisyah.R@Example.COM ", "note" => "  #{profile["note"]}  ")

      expect(response).to have_http_status(:ok)
      expect(data).to include(profile.merge("id" => member.id, "name" => "Aisyah Binti Rahman", "email" => "aisyah.r@example.com"))
      expect(data.keys).to include("membership", "entitlements", "bookings", "linked_email")
      expect(member.reload).to have_attributes(name: "Aisyah Binti Rahman", date_of_birth: Date.new(1994, 3, 9))

      api :get, "/staff/members/#{member.id}"
      expect(data).to include(profile)
    end

    it "changes only the fields it is sent, and clears a blank field" do
      member.update!(profile)

      api :patch, "/staff/members/#{member.id}", body: { phone: "", note: nil }

      expect(response).to have_http_status(:ok)
      expect(data).to include(profile.merge("name" => "Aisyah Rahman", "email" => "aisyah@example.com", "phone" => nil, "note" => nil))
    end

    it "shows empty details as null" do
      api :get, "/staff/members/#{member.id}"

      expect(data).to include(profile.transform_values { nil })
    end

    it "rejects invalid details and keeps the record" do
      member.update!(profile)

      api :patch, "/staff/members/#{member.id}", body: {
        name: " ", email: "not-an-email", phone: "call me", date_of_birth: "not a date",
        emergency_contact_name: "x" * 201, emergency_contact_phone: "1" * 33, note: "x" * 2001
      }

      expect(response).to have_http_status(:unprocessable_content)
      expect(error_code).to eq("validation_failed")
      expect(json.dig("error", "details").keys)
        .to match_array(%w[name email phone date_of_birth emergency_contact_name emergency_contact_phone note])
      expect(json.dig("error", "details", "date_of_birth")).to eq([ "is not a valid date" ])
      expect(member.reload).to have_attributes(name: "Aisyah Rahman", date_of_birth: Date.new(1994, 3, 9))
    end

    it "rejects a date of birth in the future" do
      api :patch, "/staff/members/#{member.id}", body: { date_of_birth: 2.days.from_now.to_date.iso8601 }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details", "date_of_birth")).to eq([ "cannot be in the future" ])
    end

    it "rejects an email another member of the organization uses" do
      create_member(chainsaw, email: "ben@example.com")

      api :patch, "/staff/members/#{member.id}", body: { email: "BEN@example.com" }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json.dig("error", "details", "email")).to eq([ "is already used by another member" ])
      expect(member.reload.email).to eq("aisyah@example.com")
    end

    it "allows an email a member of another organization uses, and the member's own email" do
      create_member(ironworks, email: "shared@example.com")

      api :patch, "/staff/members/#{member.id}", body: { email: "shared@example.com" }
      expect(response).to have_http_status(:ok)

      api :patch, "/staff/members/#{member.id}", body: { email: "SHARED@example.com", name: "Aisyah R" }
      expect(response).to have_http_status(:ok)
    end

    it "does not change a member of another organization" do
      other = create_member(ironworks, name: "Ironworks Member")

      api :patch, "/staff/members/#{other.id}", body: { name: "Taken over" }

      expect(response).to have_http_status(:not_found)
      expect(other.reload.name).to eq("Ironworks Member")
    end

    it "needs members:update", workos: true, demo: false do
      token = workos_token(workos_claims(user: staff_user("user_desk"), organization: chainsaw, permissions: %w[members:read members:create]))

      api :patch, "/staff/members/#{member.id}", token:, body: { name: "Changed" }

      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "message")).to include("members:update")
      expect(member.reload.name).to eq("Aisyah Rahman")
    end

    it "keeps staff details out of the member's own account" do
      member.update!(profile)

      expect(member.as_account_api.keys.map(&:to_s)).not_to include(*profile.keys)
    end
  end
end
