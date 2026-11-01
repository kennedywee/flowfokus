require "rails_helper"

RSpec.describe "Renewals" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:start) { Time.zone.parse("2026-11-01 10:00:00") }

  before { demo_user }

  def renew(key: SecureRandom.uuid, body: { location_id: location.id }, of: member)
    api :post, "/staff/members/#{of.id}/renewals", key:, body:
  end

  it "sells the agreed price and terms even after the catalog changes" do
    first = travel_to(start) { grant_access(chainsaw, member:, location:, amount_minor: 9_000, usage_limit: 8, duration_days: 30) }
    price = first.line_item.price
    price.product.update!(name: "Renamed")
    price.product.benefits.first.update!(usage_limit: 2)
    price.archive!
    price.product.add_price!(label: "New rate", amount_minor: 15_000, duration_days: 30)

    travel_to(start + 10.days) { renew }

    expect(response).to have_http_status(:created)
    expect(data).to include("renewal" => true, "total_minor" => 9_000, "balance_minor" => 9_000, "fulfilled" => false)
    expect(data["line_item"]).to include("price_id" => price.id, "product_name" => first.line_item.product_name, "unit_amount_minor" => 9_000)
    expect(data["line_item"]["terms"]).to eq(first.line_item.as_api[:terms].deep_stringify_keys)
    expect(Sale.find(data["id"]).renews_line_item).to eq(first.line_item)
  end

  it "appends the delivered period after the current one" do
    first = travel_to(start) { grant_access(chainsaw, member:, location:, duration_days: 30) }

    travel_to(start + 10.days) do
      renew
      sale = pay_in_full(Sale.find(data["id"]))
      sale.fulfill!(actor: demo_user)
    end

    periods = member.membership.periods.reload
    expect(periods.size).to eq(2)
    expect(periods.last.starts_at).to eq(first.line_item.fulfillment.membership_period.ends_at)
    expect(periods.last.ends_at).to eq(start + 60.days)
  end

  it "shows the renewal terms and start on the member" do
    travel_to(start) { grant_access(chainsaw, member:, location:, amount_minor: 9_000, duration_days: 30) }

    travel_to(start + 5.days) { api :get, "/staff/members/#{member.id}" }

    expect(data["renewal"]).to include("amount_minor" => 9_000, "currency" => "MYR", "duration_days" => 30,
      "starts_at" => (start + 30.days).utc.iso8601(3))
  end

  it "has no renewal before the first delivery" do
    price = create_offer(chainsaw)
    record_sale(chainsaw, member:, price:, location:)

    api :get, "/staff/members/#{member.id}"
    expect(data["renewal"]).to be_nil

    expect { renew }.not_to change(Sale, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("renewal_unavailable")
  end

  it "replays the same key and rejects a reused key" do
    grant_access(chainsaw, member:, location:)
    key = SecureRandom.uuid
    renew(key:)
    first_id = data["id"]

    expect { renew(key:) }.not_to change(Sale, :count)
    expect(response).to have_http_status(:ok)
    expect(data["id"]).to eq(first_id)

    renew(key:, body: { location_id: create_location(chainsaw).id })
    expect(response).to have_http_status(:conflict)
  end

  it "keeps other organizations out" do
    foreign_member = create_member(ironworks)
    grant_access(ironworks, member: foreign_member, location: create_location(ironworks))

    renew(of: foreign_member)
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "member_id")).to eq([ "was not found" ])
    expect(ironworks.sales.count).to eq(1)

    grant_access(chainsaw, member:, location:)
    renew(body: { location_id: create_location(ironworks).id })
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "location_id")).to eq([ "was not found" ])
  end
end
