require "rails_helper"

RSpec.describe "Early delivery" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:price) { create_offer(chainsaw, amount_minor: 12_000) }
  let(:sale) { record_sale(chainsaw, member:, price:, location:) }

  before do
    demo_user
    sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 2_000, method: "cash")
  end

  def deliver(body = nil, **options)
    api :post, "/staff/sales/#{sale.id}/fulfill", body:, **options
  end

  it "still refuses an unpaid sale without a reason" do
    deliver
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("sale_not_paid")

    deliver({ early_reason: "   " })
    expect(error_code).to eq("sale_not_paid")
  end

  it "delivers with a reason, records it, and keeps the balance due" do
    deliver({ early_reason: "Pays the rest on Friday" })

    expect(response).to have_http_status(:created)
    expect(data).to include("fulfilled" => true, "balance_minor" => 10_000, "payment_status" => "partially_paid")
    expect(data["fulfillment"]).to include("early" => true, "early_reason" => "Pays the rest on Friday", "unpaid_minor" => 10_000)
    expect(member.entitlements.count).to eq(1)

    api :get, "/staff/overview"
    expect(data).to include("unpaid_sale_count" => 1, "awaiting_fulfillment_count" => 0)
  end

  it "accepts the rest of the payment after early delivery" do
    deliver({ early_reason: "Trusted regular" })
    sale.reload.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 10_000, method: "cash")

    api :get, "/staff/sales/#{sale.id}"
    expect(data).to include("payment_status" => "paid", "balance_minor" => 0)
    expect(data["fulfillment"]).to include("early" => true, "unpaid_minor" => 10_000)
  end

  it "ignores a reason when the sale is paid in full" do
    pay_in_full(sale.reload)

    deliver({ early_reason: "Not needed" })

    expect(data["fulfillment"]).to include("early" => false, "early_reason" => nil, "unpaid_minor" => 0)
  end

  it "is protected by a database check" do
    deliver({ early_reason: "Checked" })
    fulfillment = sale.reload.fulfillment

    expect { in_savepoint { Fulfillment.where(id: fulfillment.id).update_all(early_reason: nil) } }
      .to raise_error(ActiveRecord::StatementInvalid, /fulfillments_early_reason/)
  end

  describe "permissions", workos: true, demo: false do
    let(:user) { staff_user("user_desk") }

    def token(*permissions) = workos_token(workos_claims(user:, organization: chainsaw, permissions:))

    it "needs purchases:fulfill_unpaid as well as purchases:fulfill" do
      deliver({ early_reason: "Please" }, token: token("purchases:fulfill"))
      expect(response).to have_http_status(:forbidden)
      expect(json.dig("error", "message")).to include("purchases:fulfill_unpaid")
      expect(sale.reload.fulfillment).to be_nil

      deliver({ early_reason: "Please" }, token: token("purchases:fulfill", "purchases:fulfill_unpaid"))
      expect(response).to have_http_status(:created)
    end
  end
end
