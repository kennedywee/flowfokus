require "rails_helper"

RSpec.describe "Check-in overrides" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }

  before { demo_user }

  def check_in(override_reason: nil, key: SecureRandom.uuid, **options)
    body = { member_id: member.id, location_id: location.id }
    body[:override_reason] = override_reason if override_reason
    api :post, "/staff/check_ins", key:, body:, **options
  end

  it "lets a denied member in, keeps the denial reason, and consumes nothing" do
    check_in(override_reason: "Card at home, paid yesterday")

    expect(response).to have_http_status(:created)
    expect(data).to include("result" => "granted", "denial_reason" => "no_entitlement", "entitlement_id" => nil,
      "override_reason" => "Card at home, paid yesterday")
    expect(EntitlementUsage.count).to eq(0)
  end

  it "uses the member's right as usual when it allows entry" do
    grant_access(chainsaw, member:, location:, usage_limit: 2)

    check_in(override_reason: "Not needed")

    expect(data).to include("result" => "granted", "denial_reason" => nil, "override_reason" => nil)
    expect(data["entitlement_id"]).to be_present
    expect(member.entitlements.sole.used_count).to eq(1)
  end

  it "keeps a plain denial without a reason, and the database checks the shape" do
    check_in
    expect(data).to include("result" => "denied", "override_reason" => nil)

    expect { in_savepoint { CheckIn.where(id: data["id"]).update_all(result: "granted") } }
      .to raise_error(ActiveRecord::StatementInvalid, /check_ins_result_shape/)
  end

  it "replays the same key and refuses the key with another reason" do
    key = SecureRandom.uuid
    check_in(override_reason: "Forgot card", key:)
    expect { check_in(override_reason: "Forgot card", key:) }.not_to change(CheckIn, :count)
    expect(response).to have_http_status(:ok)

    check_in(override_reason: "Other", key:)
    expect(response).to have_http_status(:conflict)
  end

  describe "permissions", workos: true, demo: false do
    it "needs check_ins:override for a reason" do
      token = workos_token(workos_claims(user: staff_user("user_desk"), organization: chainsaw, permissions: %w[check_ins:create]))

      check_in(override_reason: "Please", token:)

      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "message")).to include("check_ins:override")
      expect(CheckIn.count).to eq(0)
    end
  end
end
