require "rails_helper"

RSpec.describe "Payments" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:sale) { record_sale(chainsaw, member:, price: create_offer(chainsaw, amount_minor: 12_000), location:) }
  let(:path) { "/staff/sales/#{sale.id}/payments" }

  before { chainsaw && demo_user }

  it "accepts partial payments and then the exact remainder" do
    api :post, path, key: SecureRandom.uuid, body: { amount_minor: 5_000, method: "cash" }
    expect(response).to have_http_status(:created)
    expect(data).to include("paid_minor" => 5_000, "balance_minor" => 7_000, "payment_status" => "partially_paid")

    api :post, path, key: SecureRandom.uuid, body: { amount_minor: 7_000, method: "bank_transfer", reference: "TRX-1" }
    expect(data).to include("paid_minor" => 12_000, "balance_minor" => 0, "payment_status" => "paid")
    expect(data["payments"].map { _1.slice("amount_minor", "method", "reference") }).to eq([
      { "amount_minor" => 5_000, "method" => "cash", "reference" => nil },
      { "amount_minor" => 7_000, "method" => "bank_transfer", "reference" => "TRX-1" }
    ])
  end

  it "rejects overpayment and records nothing" do
    pay = ->(amount) { api :post, path, key: SecureRandom.uuid, body: { amount_minor: amount, method: "cash" } }
    pay.(10_000)

    expect { pay.(2_001) }.not_to change(Payment, :count)
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("overpayment")
    expect(sale.reload.paid_minor).to eq(10_000)

    pay.(2_000)
    expect { pay.(1) }.not_to change(Payment, :count)
    expect(error_code).to eq("overpayment")
  end

  it "rejects invalid amounts and methods" do
    [ 0, -5, 12.5, "abc", nil ].each do |amount|
      api :post, path, key: SecureRandom.uuid, body: { amount_minor: amount, method: "cash" }
      expect(response).to have_http_status(:unprocessable_content), "amount #{amount.inspect}"
      expect(json.dig("error", "details", "amount_minor")).to be_present
    end

    api :post, path, key: SecureRandom.uuid, body: { amount_minor: 100, method: "card" }
    expect(response).to have_http_status(:unprocessable_content)
    expect(json.dig("error", "details", "method")).to eq([ "must be cash or bank_transfer" ])
    expect(sale.payments.count).to eq(0)
  end

  it "replays the same key without paying twice" do
    key = SecureRandom.uuid
    api :post, path, key:, body: { amount_minor: 4_000, method: "cash" }

    expect { api :post, path, key:, body: { amount_minor: 4_000, method: "cash" } }.not_to change(Payment, :count)
    expect(response).to have_http_status(:ok)
    expect(data["paid_minor"]).to eq(4_000)

    api :post, path, key:, body: { amount_minor: 4_001, method: "cash" }
    expect(response).to have_http_status(:conflict)
    expect(error_code).to eq("idempotency_key_reused")
  end

  it "rejects payment changes in the model and the database" do
    payment, = sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 100, method: "cash")

    expect { payment.update!(reference: "edit") }.to raise_error(ActiveRecord::ReadOnlyRecord)
    expect { in_savepoint { Payment.where(id: payment.id).update_all(amount_minor: 1) } }.to raise_error(ActiveRecord::StatementInvalid, /immutable/)
  end

  it "treats a free sale as paid" do
    free = record_sale(chainsaw, member:, price: create_offer(chainsaw, amount_minor: 0), location:)

    api :post, "/staff/sales/#{free.id}/payments", key: SecureRandom.uuid, body: { amount_minor: 1, method: "cash" }

    expect(error_code).to eq("overpayment")
    expect(free.reload.payment_status).to eq("paid")
  end
end
