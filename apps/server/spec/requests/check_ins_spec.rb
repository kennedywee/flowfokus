require "rails_helper"

RSpec.describe "Check-ins" do
  let(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:kiara) { create_location(chainsaw, name: "Mont Kiara") }
  let(:member) { create_member(chainsaw) }

  before { chainsaw && demo_user }

  def check_in(location: bangsar, key: SecureRandom.uuid, who: member)
    api :post, "/staff/check_ins", key:, body: { member_id: who.id, location_id: location.id }
  end

  it "denies a member without rights and consumes nothing" do
    check_in

    expect(response).to have_http_status(:created)
    expect(data).to include("result" => "denied", "denial_reason" => "no_entitlement", "entitlement_id" => nil)
    expect(CheckIn.sole).to have_attributes(result: "denied", denial_reason: "no_entitlement")
  end

  it "grants counted access until the limit, then denies" do
    grant_access(chainsaw, member:, location: bangsar, usage_limit: 2)
    right = member.entitlements.sole

    2.times do
      check_in
      expect(data).to include("result" => "granted", "entitlement_id" => right.id)
    end
    check_in

    expect(data).to include("result" => "denied", "denial_reason" => "usage_limit_reached")
    expect(right.reload.used_count).to eq(2)
    expect(EntitlementUsage.where(entitlement: right).count).to eq(2)
  end

  it "records usage for unlimited access" do
    grant_access(chainsaw, member:, location: bangsar)

    3.times { check_in }

    right = member.entitlements.sole
    expect(right.reload.used_count).to eq(3)
    expect(CheckIn.where(result: "granted").count).to eq(3)
  end

  it "denies a location outside the right's scope" do
    grant_access(chainsaw, member:, location: bangsar, benefit_location: bangsar)

    check_in(location: kiara)
    expect(data).to include("result" => "denied", "denial_reason" => "location_not_allowed")

    check_in(location: bangsar)
    expect(data["result"]).to eq("granted")
  end

  it "uses unlimited access before counted access" do
    grant_access(chainsaw, member:, location: bangsar, usage_limit: 5)
    other_member_offer = create_offer(chainsaw, usage_limit: nil)
    pay_in_full(record_sale(chainsaw, member:, price: other_member_offer, location: bangsar)).tap { _1.fulfill!(actor: demo_user) }
    # The second sale renews, so both rights must overlap now for this check.
    counted = member.entitlements.find_by!(usage_limit: 5)
    unlimited = member.entitlements.find_by!(usage_limit: nil)
    unlimited.update_columns(starts_at: counted.starts_at, ends_at: counted.ends_at)

    check_in

    expect(data["entitlement_id"]).to eq(unlimited.id)
    expect(counted.reload.used_count).to eq(0)
  end

  it "denies expired and future rights" do
    travel_to(Time.utc(2026, 1, 1)) { grant_access(chainsaw, member:, location: bangsar, duration_days: 7) }
    travel_to(Time.utc(2026, 1, 8)) do
      check_in
      expect(data["denial_reason"]).to eq("no_entitlement")
    end
  end

  it "replays the same key without consuming twice" do
    grant_access(chainsaw, member:, location: bangsar, usage_limit: 3)
    key = SecureRandom.uuid
    check_in(key:)
    first = data["id"]

    expect { check_in(key:) }.not_to change(CheckIn, :count)
    expect(response).to have_http_status(:ok)
    expect(data["id"]).to eq(first)
    expect(member.entitlements.sole.used_count).to eq(1)
  end

  it "rejects key reuse for a different member or location" do
    grant_access(chainsaw, member:, location: bangsar, usage_limit: 3)
    key = SecureRandom.uuid
    check_in(key:)

    expect { check_in(key:, location: kiara) }.not_to change(CheckIn, :count)
    expect(response).to have_http_status(:conflict)
    expect(error_code).to eq("idempotency_key_reused")
    expect(member.entitlements.sole.used_count).to eq(1)
  end

  it "requires an Idempotency-Key" do
    api :post, "/staff/check_ins", body: { member_id: member.id, location_id: bangsar.id }

    expect(response).to have_http_status(:bad_request)
    expect(error_code).to eq("idempotency_key_required")
  end

  it "lists recent check-ins and filters by member" do
    other = create_member(chainsaw)
    check_in
    check_in(who: other)

    api :get, "/staff/check_ins"
    expect(data.size).to eq(2)

    api :get, "/staff/check_ins?member_id=#{other.id}"
    expect(data.map { _1["member"]["id"] }).to eq([ other.id ])
  end
end
