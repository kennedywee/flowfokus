require "rails_helper"

RSpec.describe "Refunds, voids, and revocation" do
  let(:location) { create_location(chainsaw) }
  let(:member) { create_member(chainsaw) }
  let(:price) { create_offer(chainsaw, amount_minor: 12_000) }

  before { demo_user }

  def pay(sale, amount)
    sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: amount, method: "cash").first
  end

  describe "refunds" do
    let(:sale) { record_sale(chainsaw, member:, price:, location:) }
    let!(:payment) { pay(sale, 12_000) }

    def refund(amount, key: SecureRandom.uuid, payment_id: payment.id, reason: "Moved away")
      api :post, "/staff/sales/#{sale.id}/refunds", key:, body: { payment_id:, amount_minor: amount, reason: }
    end

    it "records partial refunds up to the payment and keeps the payment" do
      refund(5_000)
      expect(response).to have_http_status(:created)
      expect(data).to include("paid_minor" => 12_000, "refunded_minor" => 5_000, "payment_status" => "paid")
      expect(data["payments"].sole).to include("amount_minor" => 12_000, "refunded_minor" => 5_000)
      expect(data["refunds"].sole).to include("payment_id" => payment.id, "amount_minor" => 5_000, "reason" => "Moved away")

      refund(7_001)
      expect(response).to have_http_status(:unprocessable_content)
      expect(error_code).to eq("refund_exceeds_payment")

      refund(7_000)
      expect(data["refunded_minor"]).to eq(12_000)
    end

    it "replays the same key and rejects a reused key" do
      key = SecureRandom.uuid
      refund(1_000, key:)
      expect { refund(1_000, key:) }.not_to change(Refund, :count)
      expect(response).to have_http_status(:ok)

      refund(2_000, key:)
      expect(response).to have_http_status(:conflict)
    end

    it "needs a reason and a payment of this sale" do
      refund(1_000, reason: " ")
      expect(json.dig("error", "details", "reason")).to be_present

      other = record_sale(chainsaw, member:, price:, location:)
      refund(1_000, payment_id: pay(other, 1_000).id)
      expect(json.dig("error", "details", "payment_id")).to eq([ "was not found" ])
    end

    it "keeps access, and refunds are immutable" do
      sale.fulfill!(actor: demo_user)
      refund(12_000)

      expect(member.entitlements.valid_at(Time.current)).to exist
      expect { Refund.last.update!(reason: "Changed") }.to raise_error(ActiveRecord::ReadOnlyRecord)
      expect { in_savepoint { Refund.update_all(amount_minor: 1) } }.to raise_error(ActiveRecord::StatementInvalid, /immutable/)
    end
  end

  describe "voids" do
    let(:sale) { record_sale(chainsaw, member:, price:, location:) }

    def void(reason: "Entered by mistake") = api(:post, "/staff/sales/#{sale.id}/void", body: { reason: })

    it "voids an unpaid sale, then refuses payment and delivery" do
      void
      expect(response).to have_http_status(:ok)
      expect(data).to include("payment_status" => "void", "void_reason" => "Entered by mistake")
      expect(data["voided_at"]).to be_present

      api :post, "/staff/sales/#{sale.id}/payments", key: SecureRandom.uuid, body: { amount_minor: 100, method: "cash" }
      expect(error_code).to eq("sale_voided")
      api :post, "/staff/sales/#{sale.id}/fulfill", body: { early_reason: "No" }
      expect(error_code).to eq("sale_voided")

      api :get, "/staff/overview"
      expect(data["unpaid_sale_count"]).to eq(0)

      void
      expect(response).to have_http_status(:ok)
    end

    it "needs all kept money refunded first, and never voids a delivered sale" do
      payment = pay(sale, 2_000)
      void
      expect(error_code).to eq("sale_not_voidable")

      sale.reload.record_refund!(actor: demo_user, idempotency_key: SecureRandom.uuid, payment_id: payment.id, amount_minor: 2_000, reason: "Mistake")
      void
      expect(response).to have_http_status(:ok)

      delivered = grant_access(chainsaw, member: create_member(chainsaw), location:)
      api :post, "/staff/sales/#{delivered.id}/void", body: { reason: "No" }
      expect(error_code).to eq("sale_not_voidable")
    end

    it "needs a reason" do
      api :post, "/staff/sales/#{sale.id}/void", body: { reason: "" }
      expect(response).to have_http_status(:bad_request)
      expect(sale.reload).not_to be_voided
    end
  end

  describe "revocation" do
    let(:start) { Time.zone.parse("2026-11-01 09:00:00") }

    it "ends only that delivery's access and frees its dates" do
      first = travel_to(start) { grant_access(chainsaw, member:, location:, duration_days: 30) }
      second, = travel_to(start + 1.day) do
        Sale.renew!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: location.id)
      end
      travel_to(start + 1.day) { pay_in_full(second).fulfill!(actor: demo_user) }

      travel_to(start + 2.days) { api :post, "/staff/sales/#{second.id}/revoke", body: { reason: "Refunded in cash" } }

      expect(response).to have_http_status(:ok)
      expect(data["fulfillment"]).to include("revoke_reason" => "Refunded in cash")
      expect(data["fulfillment"]["membership_period"]["revoked_at"]).to be_present
      expect(first.reload.line_item.fulfillment).not_to be_revoked

      travel_to(start + 40.days) do
        result, = CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: location.id)
        expect(result.denial_reason).to eq("no_entitlement")
      end
      travel_to(start + 3.days) do
        result, = CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: location.id)
        expect(result).to be_granted
        api :get, "/staff/members/#{member.id}"
        expect(data["entitlements"].size).to eq(1)
        expect(data["renewal"]["starts_at"]).to eq((start + 30.days).utc.iso8601(3))
      end

      third, = travel_to(start + 3.days) do
        Sale.renew!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: location.id)
      end
      travel_to(start + 3.days) { pay_in_full(third).fulfill!(actor: demo_user) }
      expect(third.reload.fulfillment.membership_period.starts_at).to eq(start + 30.days)
    end

    it "is idempotent and needs a delivered sale" do
      sale = grant_access(chainsaw, member:, location:)
      api :post, "/staff/sales/#{sale.id}/revoke", body: { reason: "Banned" }
      revoked_at = data["fulfillment"]["revoked_at"]
      api :post, "/staff/sales/#{sale.id}/revoke", body: { reason: "Again" }
      expect(data["fulfillment"]).to include("revoked_at" => revoked_at, "revoke_reason" => "Banned")

      undelivered = record_sale(chainsaw, member:, price:, location:)
      api :post, "/staff/sales/#{undelivered.id}/revoke", body: { reason: "No" }
      expect(error_code).to eq("sale_not_delivered")
    end
  end

  describe "tenant isolation and permissions" do
    it "never reaches another organization's sale" do
      foreign = grant_access(ironworks, member: create_member(ironworks), location: create_location(ironworks))

      api :post, "/staff/sales/#{foreign.id}/revoke", body: { reason: "No" }
      expect(response).to have_http_status(:not_found)
      api :post, "/staff/sales/#{foreign.id}/void", body: { reason: "No" }
      expect(response).to have_http_status(:not_found)
      api :post, "/staff/sales/#{foreign.id}/refunds", key: SecureRandom.uuid, body: { payment_id: foreign.payments.first.id, amount_minor: 1, reason: "No" }
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.fulfillment).not_to be_revoked
    end

    describe "with a WorkOS token", workos: true, demo: false do
      let(:user) { staff_user("user_desk") }
      let(:token) { workos_token(workos_claims(user:, organization: chainsaw, permissions: %w[purchases:read payments:create])) }

      it "needs the matching permission" do
        sale = grant_access(chainsaw, member:, location:)
        { "refunds" => "purchases:refund", "void" => "purchases:void", "revoke" => "memberships:revoke" }.each do |action, permission|
          api :post, "/staff/sales/#{sale.id}/#{action}", token: token, key: SecureRandom.uuid,
            body: { reason: "No", payment_id: sale.payments.first.id, amount_minor: 1 }
          expect(response).to have_http_status(:forbidden)
          expect(json.dig("error", "message")).to include(permission)
        end
      end
    end
  end
end
