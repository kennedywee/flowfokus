require "rails_helper"

RSpec.describe "Member bookings and online checkout", workos: true, demo: false do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:program) { create_program(chainsaw, location: bangsar, capacity: 1, name: "Yoga") }
  let(:occurrence) { program.occurrences.first }
  let(:person) { staff_user("user_member_booker", email: "booker@example.test") }
  let(:member) { create_member(chainsaw, name: "Mei").tap { _1.update!(user: person) } }
  let(:token) { workos_token(workos_claims(user: person, organization: nil)) }
  let(:ticket) { program.add_ticket!(label: "Drop-in", amount_minor: 2_500).first }

  before { chainsaw && ironworks && demo_user && member }

  def checkout(body, key: SecureRandom.uuid) = api(:post, "/member/checkouts", token:, key:, body:)

  describe "public schedule" do
    it "lists published programs and their times with ticket prices and covering offers" do
      ticket
      create_pass(chainsaw, program_kind: "group_class", name: "Class pack")
      create_program(chainsaw, location: bangsar, published: false, name: "Hidden")

      api :get, "/public/schedule", token: nil
      expect(response).to have_http_status(:ok)
      expect(data["programs"].sole).to include("name" => "Yoga", "location_name" => "Bangsar", "accepted_by" => [ "Class pack" ])
      expect(data["programs"].sole["ticket_prices"].sole).to include("label" => "Drop-in", "duration_days" => nil)
      expect(data["occurrences"].sole).to include("id" => occurrence.id, "spots_left" => 1, "bookable" => true)

      api :get, "/public/products", token: nil
      expect(data.map { _1["kind"] }).to all(eq("pass"))
    end
  end

  it "books with a pass, shows it in the account, and cancels it" do
    right = deliver(chainsaw, member:, price: create_pass(chainsaw, program_kind: "group_class"), location: bangsar)
      .fulfillment.benefit_grant.entitlements.sole

    api :get, "/member/occurrences/#{occurrence.id}", token: token
    expect(data["rights"].map { _1["id"] }).to eq([ right.id ])
    expect(data["program"]).to include("name" => "Yoga")

    api :post, "/member/bookings", token:, body: { occurrence_id: occurrence.id, entitlement_id: right.id }
    expect(response).to have_http_status(:created)
    expect(data).to include("status" => "confirmed", "cancellable" => true, "location_name" => "Bangsar")
    booking_id = data["id"]

    api :post, "/member/bookings", token:, body: { occurrence_id: occurrence.id, entitlement_id: right.id }
    expect(response).to have_http_status(:ok)

    api :get, "/member/account", token: token
    expect(data["bookings"].sole).to include("id" => booking_id)
    api :get, "/member/bookings", token: token
    expect(data.sole).to include("id" => booking_id)

    api :post, "/member/bookings/#{booking_id}/cancel", token: token
    expect(response).to have_http_status(:ok)
    expect(data).to include("status" => "cancelled", "use_returned" => true)
    expect(right.reload.used_count).to eq(0)
  end

  it "says when online payment is off" do
    checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
    expect(response).to have_http_status(:service_unavailable)
    expect(error_code).to eq("payments_unavailable")
    expect(Booking.count).to eq(0)
  end

  describe "with the test provider", payments: true do
    it "holds the spot, pays, creates the sale, and confirms the booking" do
      key = SecureRandom.uuid
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id }, key:)
      expect(response).to have_http_status(:created)
      expect(data).to include("status" => "open", "provider" => "test", "payment_url" => nil, "amount_minor" => 2_500,
        "product_kind" => "ticket", "sale_id" => nil)
      id = data["id"]
      expect(Sale.count).to eq(0)
      expect(occurrence.spots_left).to eq(0)

      checkout({ price_id: ticket.id, occurrence_id: occurrence.id }, key:)
      expect(response).to have_http_status(:ok)
      expect(data["id"]).to eq(id)

      api :get, "/public/organization", token: nil
      expect(data["online_payments"]).to be(true)

      api :post, "/member/checkouts/#{id}/test_payment", token: token
      expect(response).to have_http_status(:ok)
      expect(data["status"]).to eq("paid")
      sale = Sale.find(data["sale_id"])
      expect(sale).to have_attributes(channel: "online", created_by_user_id: nil, location_id: nil, occurrence_id: occurrence.id)
      expect(sale.payments.sole).to have_attributes(payment_method: "online", provider: "test", recorded_by_user_id: nil)
      expect(sale.fulfillment).to have_attributes(fulfilled_by_user_id: nil)

      api :get, "/member/checkouts/#{id}", token: token
      booking = Booking.find(data["booking_id"])
      expect(booking).to have_attributes(sale_id: sale.id, held_until: nil)
      expect(booking.status).to eq("confirmed")

      api :post, "/member/checkouts/#{id}/test_payment", token: token
      expect(response).to have_http_status(:ok)
      expect(Sale.count).to eq(1)

      api :post, "/member/bookings/#{booking.id}/cancel", token: token
      expect(error_code).to eq("booking_not_allowed")
    end

    it "frees the spot when the checkout expires or is cancelled" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
      id = data["id"]
      other = create_member(chainsaw)

      travel(Checkout::HOLD + 1.minute) do
        fresh = workos_token(workos_claims(user: person, organization: nil))
        expect(occurrence.spots_left).to eq(1)
        api :get, "/member/checkouts/#{id}", token: fresh
        expect(data["status"]).to eq("expired")
        api :post, "/member/checkouts/#{id}/test_payment", token: fresh
        expect(error_code).to eq("checkout_closed")
        Checkout.open!(member: other, idempotency_key: SecureRandom.uuid, price_id: ticket.id, occurrence_id: occurrence.id)
      end

      api :post, "/member/checkouts/#{id}/cancel", token: token
      expect(data["status"]).to eq("cancelled")
    end

    it "refuses a full time and a second spot" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
      api :post, "/member/checkouts/#{data['id']}/test_payment", token: token

      checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
      expect(error_code).to eq("booking_not_allowed")

      second = staff_user("user_second_booker")
      create_member(chainsaw).update!(user: second)
      api :post, "/member/checkouts", token: workos_token(workos_claims(user: second, organization: nil)), key: SecureRandom.uuid,
        body: { price_id: ticket.id, occurrence_id: occurrence.id }
      expect(error_code).to eq("occurrence_full")
    end

    it "sells a pass online without a time" do
      pass = create_pass(chainsaw, program_kind: "group_class")
      checkout({ price_id: pass.id })
      api :post, "/member/checkouts/#{data['id']}/test_payment", token: token

      expect(data).to include("status" => "paid", "occurrence" => nil, "booking_id" => nil)
      expect(member.entitlements.program_access.sole).to have_attributes(usage_limit: 10)
    end

    it "completes a free ticket at once" do
      free = program.add_ticket!(label: "Trial", amount_minor: 0).first
      checkout({ price_id: free.id, occurrence_id: occurrence.id })

      expect(data).to include("status" => "paid", "provider" => "free")
      expect(Sale.find(data["sale_id"]).payments).to be_empty
      expect(Booking.find(data["booking_id"]).status).to eq("confirmed")
    end

    it "refuses unpublished offers and other members' checkouts" do
      hidden = create_pass(chainsaw, published: false)
      checkout({ price_id: hidden.id })
      expect(response).to have_http_status(:not_found)

      other = create_member(chainsaw)
      foreign, = Checkout.open!(member: other, idempotency_key: SecureRandom.uuid, price_id: create_pass(chainsaw).id)
      api :get, "/member/checkouts/#{foreign.id}", token: token
      expect(response).to have_http_status(:not_found)
    end

    it "refuses test payments when the provider is off" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
      id = data["id"]
      with_env("FLOWFOKUS_TEST_PAYMENTS" => nil) do
        api :post, "/member/checkouts/#{id}/test_payment", token: token
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  it "refuses test payments in production" do
    expect { Flowfokus::Payments.verify_environment!(env: { "FLOWFOKUS_TEST_PAYMENTS" => "true" }, rails_env: "production") }
      .to raise_error(Flowfokus::Payments::ProductionError, /not allowed in production/)
  end
end
