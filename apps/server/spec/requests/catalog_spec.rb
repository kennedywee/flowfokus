require "rails_helper"

RSpec.describe "Catalog" do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let!(:unlimited) { create_offer(chainsaw, name: "Monthly Unlimited", amount_minor: 12_000) }
  let!(:limited) { create_offer(chainsaw, name: "Bangsar 8", amount_minor: 8_000, usage_limit: 8, location: bangsar) }
  let!(:hidden) { create_offer(chainsaw, name: "Staff Trial", amount_minor: 0, published: false) }
  let!(:archived) do
    unlimited.product.prices.create!(organization: chainsaw, label: "Old", amount_minor: 10_000, currency: "MYR", duration_days: 30).tap(&:archive!)
  end

  before { demo_user }

  describe "public" do
    it "shows the published organization without a token" do
      api :get, "/public/organization", token: nil

      expect(response).to have_http_status(:ok)
      expect(data).to eq(
        "slug" => "chainsaw", "name" => "Chainsaw", "timezone" => "Asia/Kuala_Lumpur", "currency" => "MYR",
        "locations" => [ { "name" => "Bangsar", "address" => "1 Test Street" } ]
      )
    end

    it "hides unpublished and unknown organizations" do
      create_organization(slug: "hidden", published: false)

      api :get, "/public/organization", organization: "hidden", token: nil
      expect(response).to have_http_status(:not_found)
      api :get, "/public/products", organization: "unknown-gym", token: nil
      expect(response).to have_http_status(:not_found)
      api :get, "/public/products", organization: "Not A Slug!", token: nil
      expect(response).to have_http_status(:not_found)
    end

    it "requires the organization header" do
      api :get, "/public/organization", organization: nil, token: nil

      expect(response).to have_http_status(:bad_request)
      expect(error_code).to eq("organization_required")
    end

    it "lists only published products with available prices" do
      api :get, "/public/products", token: nil

      expect(data.map { _1["name"] }).to match_array([ "Monthly Unlimited", "Bangsar 8" ])
      monthly = data.find { _1["name"] == "Monthly Unlimited" }
      expect(monthly["prices"].map { _1["amount_minor"] }).to eq([ 12_000 ])
      bangsar_offer = data.find { _1["name"] == "Bangsar 8" }
      expect(bangsar_offer["benefits"]).to eq([ { "kind" => "gym_access", "name" => "Gym access", "usage_limit" => 8, "location_name" => "Bangsar" } ])
    end
  end

  describe "staff" do
    it "lists every product with archived prices marked unavailable" do
      api :get, "/staff/products"

      expect(response).to have_http_status(:ok)
      expect(data.map { _1["name"] }).to include("Staff Trial")
      monthly = data.find { _1["name"] == "Monthly Unlimited" }
      old = monthly["prices"].find { _1["label"] == "Old" }
      expect(old).to include("available" => false)
      expect(old["archived_at"]).to be_present
    end
  end

  describe Price, type: :model do
    it "never changes amount, currency, duration, or product" do
      expect { unlimited.update!(amount_minor: 1) }.to raise_error(ActiveRecord::ReadonlyAttributeError)
      expect { unlimited.update!(duration_days: 1) }.to raise_error(ActiveRecord::ReadonlyAttributeError)
      expect(unlimited.reload.amount_minor).to eq(12_000)
    end

    it "allows label and availability changes" do
      unlimited.update!(label: "Monthly promo", available: false)

      expect(unlimited.reload).to have_attributes(label: "Monthly promo", sellable?: false)
    end

    it "must use the organization currency" do
      price = unlimited.product.prices.new(organization: chainsaw, label: "USD", amount_minor: 100, currency: "USD", duration_days: 1)

      expect(price).not_to be_valid
      expect(price.errors[:currency]).to be_present
    end
  end
end
