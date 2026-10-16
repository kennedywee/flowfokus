require "rails_helper"

RSpec.describe "Sales" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:price) { create_offer(chainsaw, name: "Monthly 8", amount_minor: 8_000, usage_limit: 8, duration_days: 30) }
  let(:body) { { member_id: member.id, price_id: price.id, location_id: location.id } }

  before { chainsaw && demo_user }

  it "records one line with snapshotted terms" do
    api :post, "/staff/sales", key: SecureRandom.uuid, body: body

    expect(response).to have_http_status(:created)
    expect(data).to include("total_minor" => 8_000, "paid_minor" => 0, "balance_minor" => 8_000,
      "payment_status" => "unpaid", "fulfilled" => false, "fulfillment" => nil, "payments" => [], "currency" => "MYR")
    expect(data["line_item"]).to include("product_name" => "Monthly 8", "quantity" => 1, "unit_amount_minor" => 8_000)
    expect(data["line_item"]["terms"]).to eq(
      "duration_days" => 30,
      "benefits" => [ { "kind" => "gym_access", "name" => "Gym access", "usage_limit" => 8, "location_id" => nil } ]
    )
  end

  it "keeps purchased terms after catalog edits" do
    sale = record_sale(chainsaw, member:, price:, location:)
    price.product.update!(name: "Renamed")
    price.product.benefits.first.update!(usage_limit: 2, name: "Changed")
    price.update!(label: "New label")
    price.archive!

    api :get, "/staff/sales/#{sale.id}"

    expect(data["line_item"]).to include("product_name" => "Monthly 8", "price_label" => "Standard")
    expect(data["line_item"]["terms"]["benefits"].sole).to include("usage_limit" => 8, "name" => "Gym access")
  end

  it "rejects line item changes in the model and the database" do
    line = record_sale(chainsaw, member:, price:, location:).line_item

    expect { line.update!(product_name: "Hacked") }.to raise_error(ActiveRecord::ReadOnlyRecord)
    expect { in_savepoint { SaleLineItem.where(id: line.id).update_all(unit_amount_minor: 1) } }.to raise_error(ActiveRecord::StatementInvalid, /immutable/)
  end

  it "replays the same key and body without a second sale" do
    key = SecureRandom.uuid
    api :post, "/staff/sales", key:, body: body
    first_id = data["id"]

    expect { api :post, "/staff/sales", key:, body: body }.not_to change(Sale, :count)
    expect(response).to have_http_status(:ok)
    expect(data["id"]).to eq(first_id)
  end

  it "rejects the same key with a different body" do
    key = SecureRandom.uuid
    api :post, "/staff/sales", key:, body: body

    other = create_member(chainsaw)
    expect { api :post, "/staff/sales", key:, body: body.merge(member_id: other.id) }.not_to change(Sale, :count)
    expect(response).to have_http_status(:conflict)
    expect(error_code).to eq("idempotency_key_reused")
  end

  it "requires a valid Idempotency-Key" do
    api :post, "/staff/sales", body: body
    expect(response).to have_http_status(:bad_request)
    expect(error_code).to eq("idempotency_key_required")

    api :post, "/staff/sales", key: "short", body: body
    expect(response).to have_http_status(:bad_request)
    expect(error_code).to eq("bad_request")
  end

  it "rejects archived and unavailable prices" do
    price.archive!

    expect { api :post, "/staff/sales", key: SecureRandom.uuid, body: body }.not_to change(Sale, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("price_unavailable")
  end

  it "reports missing references" do
    api :post, "/staff/sales", key: SecureRandom.uuid, body: {}

    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details").keys).to match_array(%w[member_id price_id location_id])
  end

  it "lists sales newest first and filters by member" do
    old = record_sale(chainsaw, member:, price:, location:)
    other = record_sale(chainsaw, member: create_member(chainsaw), price:, location:)

    api :get, "/staff/sales"
    expect(data.map { _1["id"] }).to eq([ other.id, old.id ])

    api :get, "/staff/sales?member_id=#{member.id}"
    expect(data.map { _1["id"] }).to eq([ old.id ])
  end
end
