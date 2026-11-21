require "rails_helper"

RSpec.describe "Staff overview" do
  # Wednesday 28 October 2026, 10:00 in Kuala Lumpur.
  let(:now) { Time.find_zone("Asia/Kuala_Lumpur").local(2026, 10, 28, 10) }

  before { chainsaw && demo_user }

  it "counts members, memberships, and sales" do
    location = create_location(chainsaw)
    active = create_member(chainsaw)
    grant_access(chainsaw, member: active, location:)
    record_sale(chainsaw, member: create_member(chainsaw), price: create_offer(chainsaw), location:)
    pay_in_full(record_sale(chainsaw, member: active, price: create_offer(chainsaw), location:))
    create_member(ironworks)

    api :get, "/staff/overview"

    expect(data).to include(
      "member_count" => 2,
      "active_membership_count" => 1,
      "unpaid_sale_count" => 1,
      "awaiting_fulfillment_count" => 1
    )
    expect(data).not_to have_key("check_ins_today")
  end

  it "reports today's sales, money received, and new members in the organization's time zone" do
    location = create_location(chainsaw)
    price = create_offer(chainsaw, amount_minor: 10_000)
    # 23:30 the day before in Kuala Lumpur is the same UTC day as `now`.
    travel_to(now - 10.hours - 30.minutes) { pay_in_full(record_sale(chainsaw, member: create_member(chainsaw), price:, location:)) }
    travel_to(now) do
      member = create_member(chainsaw)
      pay_in_full(record_sale(chainsaw, member:, price:, location:))
      sale = record_sale(chainsaw, member:, price:, location:)
      sale.record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 4_000, method: "bank_transfer")
      record_sale(chainsaw, member:, price:, location:).void!(actor: demo_user, reason: "Mistake")
      grant_access(ironworks, member: create_member(ironworks), location: create_location(ironworks))
    end

    travel_to(now + 1.hour) { api :get, "/staff/overview" }

    expect(data).to include("currency" => "MYR", "new_members_today" => 1)
    expect(data["money"]).to include(
      "sales_today" => { "count" => 2, "total_minor" => 20_000 },
      "collected_today_minor" => 14_000,
      "payments_today" => [
        { "method" => "cash", "amount_minor" => 10_000 },
        { "method" => "bank_transfer", "amount_minor" => 4_000 },
        { "method" => "online", "amount_minor" => 0 }
      ]
    )
  end

  it "reports what is due and which paid sales wait for delivery" do
    location = create_location(chainsaw)
    price = create_offer(chainsaw, amount_minor: 10_000)
    aina = create_member(chainsaw, name: "Aina")
    ben = create_member(chainsaw, name: "Ben")
    oldest = travel_to(now - 34.days) { record_sale(chainsaw, member: aina, price:, location:) }
    travel_to(now - 2.days) do
      record_sale(chainsaw, member: ben, price:, location:)
        .record_payment!(actor: demo_user, idempotency_key: SecureRandom.uuid, amount_minor: 4_000, method: "cash")
      record_sale(chainsaw, member: ben, price:, location:).void!(actor: demo_user, reason: "Mistake")
    end
    waiting = travel_to(now - 1.day) { pay_in_full(record_sale(chainsaw, member: ben, price:, location:)) }
    travel_to(now - 3.hours) { grant_access(chainsaw, member: aina, location:) }
    record_sale(ironworks, member: create_member(ironworks), price: create_offer(ironworks), location: create_location(ironworks))

    travel_to(now) { api :get, "/staff/overview" }

    expect(data["money"]).to include(
      "due" => { "total_minor" => 16_000, "oldest_sale" => { "id" => oldest.id, "purchased_at" => oldest.purchased_at.utc.iso8601(3) } },
      "awaiting_fulfillment" => [ { "sale_id" => waiting.id, "member_name" => "Ben" } ]
    )
  end

  it "reports nothing due when every sale is paid" do
    api :get, "/staff/overview"

    expect(data["money"]).to include("due" => { "total_minor" => 0, "oldest_sale" => nil }, "awaiting_fulfillment" => [])
  end

  it "counts memberships whose access ends within seven days" do
    location = create_location(chainsaw)
    # Ends in 3 days. Counted.
    grant_access(chainsaw, member: create_member(chainsaw), location:, at: now - 27.days)
    # Ends in 3 days, then a renewal continues it. Not counted.
    renewed = create_member(chainsaw)
    grant_access(chainsaw, member: renewed, location:, at: now - 27.days)
    travel_to(now - 1.day) do
      renewal, = Sale.renew!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: renewed.id, location_id: location.id)
      pay_in_full(renewal).fulfill!(actor: demo_user)
    end
    # Ends in 20 days. Not counted.
    grant_access(chainsaw, member: create_member(chainsaw), location:, at: now - 10.days)
    # Ended yesterday. Not counted.
    grant_access(chainsaw, member: create_member(chainsaw), location:, at: now - 31.days)
    grant_access(ironworks, member: create_member(ironworks), location: create_location(ironworks), at: now - 27.days)

    travel_to(now) { api :get, "/staff/overview" }

    expect(data["memberships_ending_count"]).to eq(1)
  end

  it "reports first-run setup progress" do
    api :get, "/staff/overview"
    expect(data["setup"]).to eq("location" => false, "product" => false, "member" => false, "sale" => false)

    location = create_location(chainsaw)
    record_sale(chainsaw, member: create_member(chainsaw), price: create_offer(chainsaw), location:)
    create_location(ironworks)

    api :get, "/staff/overview"
    expect(data["setup"]).to eq("location" => true, "product" => true, "member" => true, "sale" => true)
  end

  describe "permissions", workos: true, demo: false do
    it "leaves money out without purchases:read" do
      token = workos_token(workos_claims(user: staff_user("user_desk"), organization: chainsaw, permissions: %w[members:read]))
      api :get, "/staff/overview", token: token

      expect(response).to have_http_status(:ok)
      expect(data).to include("new_members_today" => 0)
      expect(data).not_to have_key("money")
    end
  end
end
