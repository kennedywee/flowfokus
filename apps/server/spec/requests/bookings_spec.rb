require "rails_helper"

RSpec.describe "Bookings at the desk" do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:program) { create_program(chainsaw, location: bangsar, capacity: 2, name: "Yoga", weeks: 2) }
  let(:occurrence) { program.occurrences.first }
  let(:member) { create_member(chainsaw, name: "Mei") }
  let(:pass_price) { create_pass(chainsaw, usage_limit: 5, program_kind: "group_class") }
  let(:right) { deliver(chainsaw, member:, price: pass_price, location: bangsar).fulfillment.benefit_grant.entitlements.sole }

  before { demo_user }

  def book(who: member, with: right, at: occurrence)
    api :post, "/staff/bookings", body: { occurrence_id: at.id, member_id: who.id, entitlement_id: with.id }
  end

  it "delivers a pass without a membership" do
    sale = deliver(chainsaw, member:, price: pass_price, location: bangsar)

    granted = sale.fulfillment.benefit_grant.entitlements.sole
    expect(sale.fulfillment).to have_attributes(membership_id: nil)
    expect(granted).to have_attributes(kind: "program_access", program_kind: "group_class", usage_limit: 5)
    expect(granted.ends_at).to eq(sale.purchased_at + 30.days)
    expect(member.membership).to be_nil
  end

  it "shows the member's rights and the ticket prices for a time" do
    right
    program.add_ticket!(label: "Drop-in", amount_minor: 2_500)

    api :get, "/staff/occurrences/#{occurrence.id}/options?member_id=#{member.id}"
    expect(response).to have_http_status(:ok)
    expect(data["rights"].map { _1["id"] }).to eq([ right.id ])
    expect(data["ticket_prices"].map { _1["label"] }).to eq([ "Drop-in" ])
    expect(data["booking"]).to be_nil
  end

  it "books with a pass, uses one, and replays the same booking" do
    book
    expect(response).to have_http_status(:created)
    expect(data).to include("spots_taken" => 1, "spots_left" => 1)
    expect(data["bookings"].sole).to include("status" => "confirmed", "source" => "entitlement")
    expect(right.reload.used_count).to eq(1)

    book
    expect(response).to have_http_status(:ok)
    expect(right.reload.used_count).to eq(1)
    expect(Booking.count).to eq(1)

    api :get, "/staff/occurrences/#{occurrence.id}"
    expect(response).to have_http_status(:ok)
    expect(data["program"]).to include("name" => "Yoga", "location_name" => "Bangsar")
    expect(data["bookings"].sole["member"]).to include("name" => "Mei")
  end

  it "refuses a full time, a right that does not cover it, and a started time" do
    others = Array.new(2) { create_member(chainsaw) }
    others.each do |other|
      right_for_other = deliver(chainsaw, member: other, price: pass_price, location: bangsar).fulfillment.benefit_grant.entitlements.sole
      book(who: other, with: right_for_other)
      expect(response).to have_http_status(:created)
    end

    book
    expect(error_code).to eq("occurrence_full")

    seminar = create_program(chainsaw, location: bangsar, kind: "event", name: "Seminar")
    book(at: seminar.occurrences.first)
    expect(error_code).to eq("booking_not_allowed")

    travel_to(occurrence.starts_at + 1.minute) do
      book(at: occurrence)
      expect(error_code).to eq("occurrence_unavailable")
    end
  end

  it "refuses another gym's records" do
    foreign_member = create_member(ironworks)
    book(who: foreign_member)
    expect(response).to have_http_status(:not_found)
  end

  it "cancels and returns the use, or keeps it" do
    book
    booking = Booking.last

    api :post, "/staff/bookings/#{booking.id}/cancel", body: { reason: "Changed plans" }
    expect(response).to have_http_status(:ok)
    expect(data["bookings"].sole).to include("status" => "cancelled", "use_returned" => true, "cancel_reason" => "Changed plans")
    expect(right.reload.used_count).to eq(0)
    expect(booking.usage.reload.returned_at).to be_present

    book
    second = Booking.live.last
    api :post, "/staff/bookings/#{second.id}/cancel", body: { reason: "Late cancel", return_use: false }
    expect(right.reload.used_count).to eq(1)

    api :post, "/staff/bookings/#{second.id}/cancel", body: { reason: "Again" }
    expect(response).to have_http_status(:ok)
    expect(right.reload.used_count).to eq(1)
  end

  it "marks attendance once and keeps attended bookings" do
    book
    booking = Booking.last

    api :post, "/staff/bookings/#{booking.id}/attend"
    expect(response).to have_http_status(:ok)
    expect(data["bookings"].sole).to include("status" => "attended")
    api :post, "/staff/bookings/#{booking.id}/attend"
    expect(response).to have_http_status(:ok)

    api :post, "/staff/bookings/#{booking.id}/cancel", body: { reason: "Oops" }
    expect(error_code).to eq("booking_not_allowed")
  end

  it "cancels a time with its bookings and returns their uses" do
    book

    api :post, "/staff/occurrences/#{occurrence.id}/cancel", body: { reason: "Coach is ill" }
    expect(response).to have_http_status(:ok)
    expect(data).to include("cancel_reason" => "Coach is ill", "bookable" => false, "spots_taken" => 0)
    expect(data["bookings"].sole).to include("status" => "cancelled", "use_returned" => true)
    expect(right.reload.used_count).to eq(0)

    book
    expect(error_code).to eq("occurrence_unavailable")
  end

  describe "tickets at the desk" do
    let(:ticket) { program.add_ticket!(label: "Drop-in", amount_minor: 2_500).first }
    let(:sale_body) { { member_id: member.id, price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id } }

    it "sells a ticket for a time and books it on delivery" do
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body
      expect(response).to have_http_status(:created)
      expect(data).to include("channel" => "desk", "booking_id" => nil)
      expect(data["occurrence"]).to include("id" => occurrence.id, "program_name" => "Yoga")
      expect(data.dig("line_item", "terms")).to include("kind" => "ticket", "duration_days" => nil)
      sale_id = data["id"]

      api :post, "/staff/sales/#{sale_id}/payments", key: SecureRandom.uuid, body: { amount_minor: 2_500, method: "cash" }
      api :post, "/staff/sales/#{sale_id}/fulfill"
      expect(response).to have_http_status(:created)
      expect(data["booking_id"]).to be_present
      expect(data["fulfillment"]).to include("membership_id" => nil, "membership_period" => nil)

      booking = Booking.find(data["booking_id"])
      expect(booking).to have_attributes(occurrence_id: occurrence.id, sale_id:)
      expect(booking.entitlement).to have_attributes(occurrence_id: occurrence.id, usage_limit: 1, used_count: 1,
        ends_at: occurrence.ends_at)
    end

    it "needs a time, and only for a ticket" do
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body.except(:occurrence_id)
      expect(error_code).to eq("occurrence_required")

      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body.merge(price_id: pass_price.id)
      expect(error_code).to eq("occurrence_required")

      other = create_program(chainsaw, location: bangsar, name: "Other")
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body.merge(occurrence_id: other.occurrences.first.id)
      expect(error_code).to eq("occurrence_required")
    end

    it "delivers nothing when the time is full" do
      2.times { deliver(chainsaw, member: create_member(chainsaw), price: ticket, location: bangsar, occurrence:) }
      sale = pay_in_full(Sale.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid,
        member_id: member.id, price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id).first)

      api :post, "/staff/sales/#{sale.id}/fulfill"
      expect(error_code).to eq("occurrence_full")
      expect(sale.reload.fulfillment).to be_nil
    end

    it "frees the spot when the sale is revoked" do
      sale = deliver(chainsaw, member:, price: ticket, location: bangsar, occurrence:)
      expect(occurrence.spots_taken).to eq(1)

      api :post, "/staff/sales/#{sale.id}/revoke", body: { reason: "Refunded" }
      expect(response).to have_http_status(:ok)
      expect(occurrence.reload.spots_taken).to eq(0)
      expect(sale.bookings.sole.reload.cancel_reason).to eq("Access revoked: Refunded")
    end
  end

  describe "permissions", workos: true, demo: false do
    let(:user) { staff_user("user_booking_reader") }
    let(:token) { workos_token(workos_claims(user:, organization: chainsaw, permissions: %w[programs:read], role: "receptionist")) }

    it "needs bookings:create and bookings:manage" do
      api :post, "/staff/bookings", token:, body: { occurrence_id: occurrence.id, member_id: member.id, entitlement_id: right.id }
      expect(response).to have_http_status(:forbidden)

      booking, = Booking.book!(member:, occurrence_id: occurrence.id, entitlement_id: right.id)
      api :post, "/staff/bookings/#{booking.id}/cancel", token:, body: { reason: "No" }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/bookings/#{booking.id}/attend", token: token
      expect(response).to have_http_status(:forbidden)
    end
  end
end
