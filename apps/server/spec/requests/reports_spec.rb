require "rails_helper"

RSpec.describe "Reports" do
  let(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:kiara) { create_location(chainsaw, name: "Mont Kiara") }
  let(:price) { create_offer(chainsaw, amount_minor: 10_000) }
  # Wednesday 28 October 2026, 10:00 in Kuala Lumpur.
  let(:now) { Time.find_zone("Asia/Kuala_Lumpur").local(2026, 10, 28, 10) }

  before { chainsaw && demo_user }

  it "groups the organization's own records by week in its time zone" do
    member = travel_to(now - 7.days) { create_member(chainsaw) }
    travel_to(now - 7.days) { pay_in_full(record_sale(chainsaw, member:, price:, location: bangsar)) }
    travel_to(now) do
      sale = record_sale(chainsaw, member:, price:, location: kiara)
      payment, = sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 4_000, method: "bank_transfer")
      sale.reload.record_refund!(actor: demo_user, idempotency_key: SecureRandom.uuid, payment_id: payment.id, amount_minor: 1_000, reason: "Promo")
      record_sale(chainsaw, member:, price:, location: kiara).void!(actor: demo_user, reason: "Mistake")
      CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: bangsar.id)
    end
    # Sunday 23:30 KL belongs to the earlier week, though it is the same UTC day as Monday morning elsewhere.
    travel_to(Time.find_zone("Asia/Kuala_Lumpur").local(2026, 10, 25, 23, 30)) { create_member(chainsaw) }
    other = create_member(ironworks)
    grant_access(ironworks, member: other, location: create_location(ironworks), at: now)

    travel_to(now + 1.hour) { api :get, "/staff/report" }
    expect(response).to have_http_status(:ok)
    weeks = data["weeks"]
    expect(weeks.map { _1["starts_on"] }).to eq(%w[2026-10-05 2026-10-12 2026-10-19 2026-10-26])
    expect(weeks[2]).to include("sale_count" => 1, "sales_minor" => 10_000, "payments_minor" => 10_000, "new_members" => 2)
    expect(weeks[3]).to include("sale_count" => 1, "sales_minor" => 10_000, "payments_minor" => 4_000, "refunds_minor" => 1_000,
      "check_ins_denied" => 1, "check_ins_granted" => 0)
    expect(data["by_location"].to_h { [ _1["name"], _1["sales_minor"] ] }).to eq("Bangsar" => 10_000, "Mont Kiara" => 10_000)
    expect(data["by_method"].to_h { [ _1["method"], _1["payments_minor"] ] }).to eq("cash" => 10_000, "bank_transfer" => 4_000)
  end

  it "accepts 1, 2, 4, or 12 weeks" do
    api :get, "/staff/report?weeks=12"
    expect(data["weeks"].size).to eq(12)
    api :get, "/staff/report?weeks=999"
    expect(data["weeks"].size).to eq(4)
  end

  describe "permissions", workos: true, demo: false do
    it "needs purchases:read and check_ins:read" do
      token = workos_token(workos_claims(user: staff_user("user_desk"), organization: chainsaw, permissions: %w[check_ins:read]))
      api :get, "/staff/report", token: token
      expect(response).to have_http_status(:forbidden)
    end
  end
end
