require "rails_helper"

RSpec.describe "Staff overview" do
  before { chainsaw && demo_user }

  it "counts members, memberships, sales, and today's check-ins" do
    location = create_location(chainsaw)
    active = create_member(chainsaw)
    grant_access(chainsaw, member: active, location:)
    record_sale(chainsaw, member: create_member(chainsaw), price: create_offer(chainsaw), location:)
    pay_in_full(record_sale(chainsaw, member: active, price: create_offer(chainsaw), location:))
    CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: active.id, location_id: location.id)
    create_member(ironworks)

    api :get, "/staff/overview"

    expect(data).to eq(
      "member_count" => 2,
      "active_membership_count" => 1,
      "unpaid_sale_count" => 1,
      "awaiting_fulfillment_count" => 1,
      "check_ins_today" => { "granted" => 1, "denied" => 0 }
    )
  end
end
