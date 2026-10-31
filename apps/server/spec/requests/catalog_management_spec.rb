require "rails_helper"

RSpec.describe "Catalog management" do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:product_body) do
    {
      name: "Monthly Unlimited", description: "All clubs", published: true,
      benefits: [ { name: "Gym access" }, { name: "Bangsar classes", usage_limit: 8, location_id: bangsar.id } ]
    }
  end

  before { demo_user }

  def create_product(body = product_body)
    api :post, "/staff/products", body: body
    data
  end

  it "creates a product with benefits and no prices" do
    product = create_product

    expect(response).to have_http_status(:created)
    expect(product).to include("name" => "Monthly Unlimited", "description" => "All clubs", "published" => true, "prices" => [])
    expect(product["benefits"].map { _1.slice("name", "usage_limit", "location_id") }).to eq([
      { "name" => "Gym access", "usage_limit" => nil, "location_id" => nil },
      { "name" => "Bangsar classes", "usage_limit" => 8, "location_id" => bangsar.id }
    ])
  end

  it "requires at least one valid benefit" do
    api :post, "/staff/products", body: product_body.merge(benefits: [])
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "benefits")).to include("must include at least one benefit")

    api :post, "/staff/products", body: product_body.merge(benefits: [ { name: "", usage_limit: 0 } ])
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details").keys).to include("benefits.name", "benefits.usage_limit")
  end

  it "rejects a benefit location from another organization" do
    foreign = create_location(ironworks, name: "Penang")

    expect {
      api :post, "/staff/products", body: product_body.merge(benefits: [ { name: "Gym", location_id: foreign.id } ])
    }.not_to change(Product, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "benefits.location_id")).to eq([ "was not found" ])

    api :post, "/staff/products", body: product_body.merge(benefits: [ { name: "Gym", location_id: SecureRandom.uuid } ])
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "adds prices in the organization currency and lists them" do
    product = create_product

    api :post, "/staff/products/#{product['id']}/prices", body: { label: "Monthly", amount_minor: 15_000, duration_days: 30 }

    expect(response).to have_http_status(:created)
    expect(data["prices"].sole).to include("label" => "Monthly", "amount_minor" => 15_000, "currency" => "MYR",
      "duration_days" => 30, "available" => true, "archived_at" => nil)
  end

  it "rejects invalid prices" do
    product = create_product

    api :post, "/staff/products/#{product['id']}/prices", body: { label: "", amount_minor: -1, duration_days: 0 }

    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details").keys).to include("label", "amount_minor", "duration_days")
  end

  it "edits a product and replaces benefit templates without changing past sales" do
    price = create_offer(chainsaw, name: "Old name", usage_limit: 4)
    sale = record_sale(chainsaw, member: create_member(chainsaw), price:, location: bangsar)

    api :patch, "/staff/products/#{price.product_id}", body: { name: "New name", published: false, benefits: [ { name: "Open gym" } ] }

    expect(response).to have_http_status(:ok)
    expect(data).to include("name" => "New name", "published" => false)
    expect(data["benefits"].map { _1["name"] }).to eq([ "Open gym" ])
    expect(sale.reload.line_item.product_name).to eq("Old name")
    expect(sale.line_item.benefit_terms.sole).to include("usage_limit" => 4, "name" => "Gym access")
  end

  it "keeps benefits when the update does not send them" do
    price = create_offer(chainsaw)

    api :patch, "/staff/products/#{price.product_id}", body: { description: nil }

    expect(data["description"]).to be_nil
    expect(data["benefits"].size).to eq(1)
  end

  it "changes a label and sale status, and archives for good" do
    price = create_offer(chainsaw)

    api :patch, "/staff/prices/#{price.id}", body: { label: "Promo", available: false }
    expect(data["prices"].sole).to include("label" => "Promo", "available" => false, "archived_at" => nil)

    api :post, "/staff/prices/#{price.id}/archive"
    expect(response).to have_http_status(:ok)
    archived_at = data["prices"].sole["archived_at"]
    expect(archived_at).to be_present

    api :post, "/staff/prices/#{price.id}/archive"
    expect(data["prices"].sole["archived_at"]).to eq(archived_at)

    api :patch, "/staff/prices/#{price.id}", body: { available: true }
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "available")).to eq([ "cannot change on an archived price" ])
  end

  it "never changes price terms" do
    price = create_offer(chainsaw, amount_minor: 9_000)

    api :patch, "/staff/prices/#{price.id}", body: { amount_minor: 1, duration_days: 1, label: "Same" }

    expect(price.reload).to have_attributes(amount_minor: 9_000, duration_days: 30, label: "Same")
  end

  it "keeps another organization's catalog out of reach" do
    foreign = create_offer(ironworks)

    api :patch, "/staff/products/#{foreign.product_id}", body: { name: "Hacked" }
    expect(response).to have_http_status(:not_found)
    api :post, "/staff/products/#{foreign.product_id}/prices", body: { label: "X", amount_minor: 1, duration_days: 1 }
    expect(response).to have_http_status(:not_found)
    api :patch, "/staff/prices/#{foreign.id}", body: { label: "Hacked" }
    expect(response).to have_http_status(:not_found)
    api :post, "/staff/prices/#{foreign.id}/archive"
    expect(response).to have_http_status(:not_found)
    expect(foreign.reload).to have_attributes(label: "Standard", archived_at: nil)
  end

  describe "permissions", workos: true, demo: false do
    let(:user) { staff_user("user_catalog_reader") }
    let(:token) { workos_token(workos_claims(user:, organization: chainsaw, permissions: %w[products:read], role: "receptionist")) }

    it "needs products:create and products:update" do
      price = create_offer(chainsaw)

      api :post, "/staff/products", token:, body: product_body
      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "message")).to include("products:create")

      api :patch, "/staff/products/#{price.product_id}", token:, body: { name: "No" }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/products/#{price.product_id}/prices", token:, body: { label: "X", amount_minor: 1, duration_days: 1 }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/prices/#{price.id}/archive", token: token
      expect(response).to have_http_status(:forbidden)
      expect(price.reload.archived_at).to be_nil
    end
  end
end
