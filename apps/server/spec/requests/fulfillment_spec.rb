require "rails_helper"

RSpec.describe "Fulfillment" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:price) { create_offer(chainsaw, amount_minor: 12_000, duration_days: 30, usage_limit: 8) }
  let(:purchased_at) { Time.utc(2026, 10, 1, 9) }

  before { chainsaw && demo_user }

  it "refuses an unpaid or partly paid sale" do
    sale = record_sale(chainsaw, member:, price:, location:)
    sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 100, method: "cash")

    expect { api :post, "/staff/sales/#{sale.id}/fulfill" }.not_to change(Fulfillment, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("sale_not_paid")
    expect(Membership.count).to eq(0)
  end

  it "creates the membership, period, grant, and entitlements from the snapshot" do
    sale = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at))
    price.product.benefits.first.update!(usage_limit: 1)

    travel_to(purchased_at + 2.days) { api :post, "/staff/sales/#{sale.id}/fulfill" }

    expect(response).to have_http_status(:created)
    expect(data["fulfilled"]).to be(true)
    period = data["fulfillment"]["membership_period"]
    expect(Time.iso8601(period["starts_at"])).to eq(purchased_at)
    expect(Time.iso8601(period["ends_at"])).to eq(purchased_at + 30.days)
    entitlement = member.entitlements.sole
    expect(entitlement).to have_attributes(usage_limit: 8, starts_at: purchased_at, ends_at: purchased_at + 30.days)
    expect(member.reload.membership.periods.count).to eq(1)
  end

  it "returns the existing fulfillment on retry and creates nothing" do
    sale = pay_in_full(record_sale(chainsaw, member:, price:, location:))
    api :post, "/staff/sales/#{sale.id}/fulfill"
    first = data["fulfillment"]["id"]

    expect {
      api :post, "/staff/sales/#{sale.id}/fulfill"
    }.not_to change { [ Fulfillment.count, MembershipPeriod.count, BenefitGrant.count, Entitlement.count ] }
    expect(response).to have_http_status(:ok)
    expect(data["fulfillment"]["id"]).to eq(first)
  end

  it "appends renewals after the latest period on one membership" do
    first = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at))
    renewal = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at + 10.days))
    late = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at + 5.days))

    [ first, renewal, late ].each { |sale| api :post, "/staff/sales/#{sale.id}/fulfill" }

    membership = member.reload.membership
    expect(Membership.where(member:).count).to eq(1)
    periods = membership.periods.map { [ _1.starts_at, _1.ends_at ] }
    expect(periods).to eq([
      [ purchased_at, purchased_at + 30.days ],
      [ purchased_at + 30.days, purchased_at + 60.days ],
      [ purchased_at + 60.days, purchased_at + 90.days ]
    ])
  end

  it "starts at purchase time after a gap" do
    old = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at - 90.days))
    old.fulfill!(actor: demo_user)
    fresh = pay_in_full(record_sale(chainsaw, member:, price:, location:, at: purchased_at))

    fresh.fulfill!(actor: demo_user)

    expect(fresh.reload.fulfillment.membership_period.starts_at).to eq(purchased_at)
  end
end
