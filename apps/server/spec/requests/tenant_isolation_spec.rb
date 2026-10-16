require "rails_helper"

RSpec.describe "Tenant isolation" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw, name: "Chainsaw Member") }
  let(:price) { create_offer(chainsaw) }

  let(:other_location) { create_location(ironworks) }
  let(:other_member) { create_member(ironworks, name: "Ironworks Member") }
  let(:other_price) { create_offer(ironworks) }
  let(:other_sale) { record_sale(ironworks, member: other_member, price: other_price, location: other_location) }

  before { demo_user }

  it "lists only the current organization's records" do
    member && other_member && price && other_price
    api :get, "/staff/members"
    expect(data.map { _1["name"] }).to eq([ "Chainsaw Member" ])

    api :get, "/staff/products"
    expect(data.map { _1["id"] }).to eq([ price.product_id ])

    other_sale
    api :get, "/staff/sales"
    expect(data).to be_empty
  end

  it "hides another organization's records by id" do
    api :get, "/staff/members/#{other_member.id}"
    expect(response).to have_http_status(:not_found)

    api :get, "/staff/sales/#{other_sale.id}"
    expect(response).to have_http_status(:not_found)
  end

  it "cannot pay or fulfill another organization's sale" do
    expect {
      api :post, "/staff/sales/#{other_sale.id}/payments", key: SecureRandom.uuid, body: { amount_minor: 100, method: "cash" }
    }.not_to change(Payment, :count)
    expect(response).to have_http_status(:not_found)

    pay_in_full(other_sale)
    expect { api :post, "/staff/sales/#{other_sale.id}/fulfill" }.not_to change(Fulfillment, :count)
    expect(response).to have_http_status(:not_found)
  end

  it "rejects foreign member, price, and location in a sale body" do
    attacks = {
      "member_id" => { member_id: other_member.id, price_id: price.id, location_id: location.id },
      "price_id" => { member_id: member.id, price_id: other_price.id, location_id: location.id },
      "location_id" => { member_id: member.id, price_id: price.id, location_id: other_location.id }
    }

    attacks.each do |field, body|
      expect { api :post, "/staff/sales", key: SecureRandom.uuid, body: }.not_to change(Sale, :count)
      expect(response).to have_http_status(:unprocessable_content)
      expect(error_code).to eq("validation_failed")
      expect(json.dig("error", "details", field)).to eq([ "was not found" ])
    end
  end

  it "rejects foreign member and location in a check-in body" do
    grant_access(ironworks, member: other_member, location: other_location)

    [ { member_id: other_member.id, location_id: location.id }, { member_id: member.id, location_id: other_location.id } ].each do |body|
      expect { api :post, "/staff/check_ins", key: SecureRandom.uuid, body: }.not_to change(CheckIn, :count)
      expect(response).to have_http_status(:unprocessable_content)
    end
    expect(Entitlement.where(member: other_member).sum(:used_count)).to eq(0)
  end

  it "keeps idempotency keys per organization" do
    key = SecureRandom.uuid
    record_sale(ironworks, member: other_member, price: other_price, location: other_location, key:)

    api :post, "/staff/sales", key:, body: { member_id: member.id, price_id: price.id, location_id: location.id }

    expect(response).to have_http_status(:created)
    expect(data["member"]["id"]).to eq(member.id)
  end

  it "applies the same rules to staff of the other organization" do
    member
    claims = Hydraflow::IdentityClaims.new(
      user_workos_id: demo_user.workos_id, organization_workos_id: ironworks.workos_id,
      permissions: Hydraflow::DemoIdentity::PERMISSIONS, demo: true
    )
    allow(Hydraflow::DemoIdentity).to receive(:claims_for).and_return(claims)

    api :get, "/staff/members/#{member.id}", organization: "ironworks"
    expect(response).to have_http_status(:not_found)

    api :get, "/staff/members", organization: "chainsaw"
    expect(response).to have_http_status(:forbidden)
    expect(error_code).to eq("organization_mismatch")
  end
end
