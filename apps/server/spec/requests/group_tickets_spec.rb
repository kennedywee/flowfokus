require "rails_helper"

RSpec.describe "Group tickets: one purchase, several spots" do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:program) { create_program(chainsaw, location: bangsar, capacity: 4, name: "Spin") }
  let(:occurrence) { program.occurrences.first }
  let(:ticket) { program.add_ticket!(label: "Drop-in", amount_minor: 3_000).first }
  let(:mei) { create_member(chainsaw, name: "Mei") }
  let(:ben) { create_member(chainsaw, name: "Ben") }

  before { demo_user }

  def sale_body(**extra)
    { member_id: mei.id, price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id }.merge(extra)
  end

  describe "at the desk" do
    it "sells three spots for a member, another member, and a guest" do
      attendees = [ { member_id: mei.id }, { member_id: ben.id }, { guest_name: "Sara Lee", guest_email: "SARA@example.test" } ]
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 3, attendees:)
      expect(response).to have_http_status(:created)
      expect(data).to include("total_minor" => 9_000)
      expect(data["line_item"]).to include("quantity" => 3, "unit_amount_minor" => 3_000, "total_minor" => 9_000)
      expect(data["attendees"]).to eq([
        { "member_id" => mei.id, "name" => "Mei", "guest" => false },
        { "member_id" => ben.id, "name" => "Ben", "guest" => false },
        { "member_id" => nil, "name" => "Sara Lee", "guest" => true }
      ])
      sale_id = data["id"]

      api :post, "/staff/sales/#{sale_id}/payments", key: SecureRandom.uuid, body: { amount_minor: 9_000, method: "cash" }
      api :post, "/staff/sales/#{sale_id}/fulfill"
      expect(response).to have_http_status(:created)
      expect(data["booking_ids"].size).to eq(3)

      right = Sale.find(sale_id).fulfillment.benefit_grant.entitlements.sole
      expect(right).to have_attributes(member_id: mei.id, usage_limit: 3, used_count: 3, occurrence_id: occurrence.id)

      api :get, "/staff/occurrences/#{occurrence.id}"
      expect(data["spots_taken"]).to eq(3)
      rows = data["bookings"].map { _1.slice("attendee_name", "guest_name", "guest_email") }
      expect(rows).to contain_exactly(
        { "attendee_name" => "Mei", "guest_name" => nil, "guest_email" => nil },
        { "attendee_name" => "Ben", "guest_name" => nil, "guest_email" => nil },
        { "attendee_name" => "Sara Lee", "guest_name" => "Sara Lee", "guest_email" => "sara@example.test" }
      )
      expect(data["bookings"].map { _1.dig("holder", "id") }.uniq).to eq([ mei.id ])
    end

    it "cancels one spot of a group and keeps the others" do
      sale = deliver_group(attendees: [ { member_id: mei.id }, { guest_name: "Sara" } ])
      sara = sale.bookings.find_by(guest_name: "Sara")

      api :post, "/staff/bookings/#{sara.id}/cancel", body: { reason: "Can't come", return_use: false }
      expect(data["spots_taken"]).to eq(1)
      expect(sale.bookings.live.sole.attendee_name).to eq("Mei")
    end

    it "refuses bad attendee lists" do
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 2)
      expect(error_code).to eq("attendees_invalid")

      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 2, attendees: [ { member_id: mei.id }, { member_id: mei.id } ])
      expect(error_code).to eq("attendees_invalid")

      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 2, attendees: [ { member_id: mei.id }, { guest_name: " " } ])
      expect(error_code).to eq("attendees_invalid")

      foreign = create_member(ironworks)
      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 1, attendees: [ { member_id: foreign.id } ])
      expect(error_code).to eq("attendees_invalid")

      api :post, "/staff/sales", key: SecureRandom.uuid, body: sale_body(quantity: 11, attendees: Array.new(11) { { guest_name: "G#{_1}" } })
      expect(response).to have_http_status(:unprocessable_content)

      pass = create_pass(chainsaw)
      api :post, "/staff/sales", key: SecureRandom.uuid,
        body: { member_id: mei.id, price_id: pass.id, location_id: bangsar.id, quantity: 2, attendees: [ { member_id: mei.id }, { member_id: ben.id } ] }
      expect(error_code).to eq("attendees_invalid")
    end

    it "delivers nothing when the group no longer fits" do
      3.times { deliver(chainsaw, member: create_member(chainsaw), price: ticket, location: bangsar, occurrence:) }
      sale = pay_in_full(Sale.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: mei.id,
        price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id, quantity: 2,
        attendees: [ { member_id: mei.id }, { guest_name: "Sara" } ]).first)

      api :post, "/staff/sales/#{sale.id}/fulfill"
      expect(error_code).to eq("occurrence_full")
      expect(json.dig("error", "message")).to eq("Only 1 spot is left at this time.")
      expect(sale.reload.fulfillment).to be_nil
    end

    it "refuses a member who already has a spot" do
      deliver(chainsaw, member: ben, price: ticket, location: bangsar, occurrence:)
      sale = pay_in_full(Sale.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: mei.id,
        price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id, quantity: 2,
        attendees: [ { member_id: mei.id }, { member_id: ben.id } ]).first)

      api :post, "/staff/sales/#{sale.id}/fulfill"
      expect(error_code).to eq("booking_not_allowed")
      expect(json.dig("error", "message")).to eq("Ben already has a spot at this time.")
    end
  end

  describe "online", workos: true, demo: false, payments: true do
    let(:person) { staff_user("user_group_buyer") }
    let(:token) { workos_token(workos_claims(user: person, organization: nil)) }

    before { mei.update!(user: person) }

    def checkout(body) = api(:post, "/member/checkouts", token:, key: SecureRandom.uuid, body:)

    it "holds every spot, then books the member and guests on payment" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id, quantity: 3,
        attendees: [ { self: true }, { guest_name: "Sara" }, { guest_name: "Tom", guest_email: "tom@example.test" } ] })
      expect(response).to have_http_status(:created)
      expect(data).to include("amount_minor" => 9_000, "quantity" => 3)
      expect(data["attendees"]).to eq([ { "name" => "Mei", "guest" => false }, { "name" => "Sara", "guest" => true }, { "name" => "Tom", "guest" => true } ])
      expect(occurrence.spots_left).to eq(1)
      id = data["id"]

      api :post, "/member/checkouts/#{id}/test_payment", token: token
      expect(data["status"]).to eq("paid")
      sale = Sale.find(data["sale_id"])
      expect(sale).to have_attributes(total_minor: 9_000, paid_minor: 9_000)
      expect(sale.bookings.map(&:status)).to all(eq("confirmed"))

      api :get, "/member/bookings", token: token
      expect(data.map { _1["attendee_name"] }).to contain_exactly("Mei", "Sara", "Tom")
      expect(data.find { _1["attendee_name"] == "Sara" }).to include("for_someone_else" => true, "guest_name" => "Sara")
      expect(data.first.keys).not_to include("guest_email", "holder")
    end

    it "lets a member buy only for guests" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id, quantity: 2, attendees: [ { guest_name: "Sara" }, { guest_name: "Tom" } ] })
      expect(response).to have_http_status(:created)
      expect(Booking.where(member_id: nil).count).to eq(2)
    end

    it "refuses other members and groups larger than the spots left" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id, quantity: 1, attendees: [ { member_id: ben.id } ] })
      expect(response).to have_http_status(:unprocessable_content)

      checkout({ price_id: ticket.id, occurrence_id: occurrence.id, quantity: 5, attendees: Array.new(5) { { guest_name: "G#{_1}" } } })
      expect(error_code).to eq("occurrence_full")
      expect(json.dig("error", "message")).to eq("Only 4 spots are left at this time.")
      expect(Booking.count).to eq(0)
    end

    it "frees every held spot when the checkout is cancelled" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id, quantity: 2, attendees: [ { self: true }, { guest_name: "Sara" } ] })
      api :post, "/member/checkouts/#{data['id']}/cancel", token: token
      expect(data["status"]).to eq("cancelled")
      expect(occurrence.spots_left).to eq(4)
    end

    it "shows the open checkout on the booking page, so the member can continue" do
      checkout({ price_id: ticket.id, occurrence_id: occurrence.id })
      id = data["id"]

      api :get, "/member/occurrences/#{occurrence.id}", token: token
      expect(data["booking"]).to include("status" => "held", "checkout_id" => id)
    end
  end

  def deliver_group(attendees:)
    sale = Sale.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: mei.id,
      price_id: ticket.id, location_id: bangsar.id, occurrence_id: occurrence.id, quantity: attendees.size, attendees:).first
    pay_in_full(sale).fulfill!(actor: demo_user)
    sale.reload
  end
end
