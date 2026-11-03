require "rails_helper"

RSpec.describe "Programs and the schedule" do
  let!(:bangsar) { create_location(chainsaw, name: "Bangsar") }
  let(:program_body) do
    { name: "Yoga Flow", kind: "group_class", location_id: bangsar.id, capacity: 12, duration_minutes: 60,
      host_name: "Aina", description: "Slow flow", published: true }
  end

  before { demo_user }

  it "creates a program, adds weekly times in the gym's time zone, and skips repeats" do
    api :post, "/staff/programs", body: program_body
    expect(response).to have_http_status(:created)
    expect(data).to include("name" => "Yoga Flow", "kind" => "group_class", "capacity" => 12, "host_name" => "Aina",
      "location_name" => "Bangsar", "occurrences" => [], "ticket" => nil, "accepted_by" => [])
    id = data["id"]

    day = (Date.current + 3).iso8601
    api :post, "/staff/programs/#{id}/occurrences", body: { date: day, time: "07:30", weeks: 3 }
    expect(response).to have_http_status(:created)
    times = data["occurrences"]
    expect(times.size).to eq(3)
    # Kuala Lumpur is UTC+8, so 07:30 local is 23:30 UTC the day before.
    expect(Time.iso8601(times.first["starts_at"])).to eq(Time.find_zone("Asia/Kuala_Lumpur").parse("#{day} 07:30"))
    expect(times.first).to include("capacity" => 12, "spots_left" => 12, "bookable" => true)

    api :post, "/staff/programs/#{id}/occurrences", body: { date: day, time: "07:30", weeks: 4 }
    expect(data["occurrences"].size).to eq(4)

    api :get, "/staff/programs"
    expect(data.sole).to include("name" => "Yoga Flow", "upcoming_count" => 4)
  end

  it "rejects a bad schedule" do
    program = create_program(chainsaw, location: bangsar)

    api :post, "/staff/programs/#{program.id}/occurrences", body: { date: "2026-13-40", time: "07:30" }
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("schedule_invalid")

    api :post, "/staff/programs/#{program.id}/occurrences", body: { date: Date.current.iso8601, time: "25:00" }
    expect(error_code).to eq("schedule_invalid")

    api :post, "/staff/programs/#{program.id}/occurrences", body: { date: Date.current.iso8601, time: "07:00", weeks: 27 }
    expect(error_code).to eq("schedule_invalid")
  end

  it "changes a program but never its kind" do
    program = create_program(chainsaw, location: bangsar)

    api :patch, "/staff/programs/#{program.id}", body: { name: "Power Yoga", capacity: 8, published: false }
    expect(response).to have_http_status(:ok)
    expect(data).to include("name" => "Power Yoga", "capacity" => 8, "published" => false, "kind" => "group_class")

    api :patch, "/staff/programs/#{program.id}", body: { capacity: 0 }
    expect(response).to have_http_status(:unprocessable_content)
    expect(error_code).to eq("validation_failed")
  end

  it "adds ticket prices as one ticket product, kept off the offers list" do
    program = create_program(chainsaw, location: bangsar)

    api :post, "/staff/programs/#{program.id}/tickets", body: { label: "Drop-in", amount_minor: 2_500 }
    expect(response).to have_http_status(:created)
    api :post, "/staff/programs/#{program.id}/tickets", body: { label: "Student", amount_minor: 1_500 }
    ticket = data["ticket"]
    expect(ticket["prices"].map { _1.slice("label", "amount_minor", "duration_days") }).to contain_exactly(
      { "label" => "Drop-in", "amount_minor" => 2_500, "duration_days" => nil },
      { "label" => "Student", "amount_minor" => 1_500, "duration_days" => nil }
    )
    expect(Product.find(ticket["product_id"])).to have_attributes(kind: "ticket", program_id: program.id)

    api :get, "/staff/products"
    expect(data.map { _1["id"] }).not_to include(ticket["product_id"])
  end

  it "lists the offers that cover a program" do
    yoga = create_program(chainsaw, location: bangsar, name: "Yoga")
    seminar = create_program(chainsaw, location: bangsar, kind: "event", name: "Seminar")
    classes = create_pass(chainsaw, program_kind: "group_class", name: "Class pack")
    create_pass(chainsaw, program_ids: [ seminar.id ], name: "Seminar pass")

    api :get, "/staff/programs/#{yoga.id}"
    expect(data["accepted_by"]).to eq([ { "id" => classes.product_id, "name" => "Class pack", "kind" => "pass" } ])
  end

  it "shows the schedule across programs" do
    create_program(chainsaw, location: bangsar, name: "Yoga", weeks: 2)
    create_program(chainsaw, location: bangsar, name: "HIIT")

    api :get, "/staff/occurrences"
    expect(data.map { _1.dig("program", "name") }).to contain_exactly("HIIT", "Yoga", "Yoga")
    expect(data.map { _1["starts_at"] }).to eq(data.map { _1["starts_at"] }.sort)

    api :get, "/staff/occurrences?days=3"
    expect(data.size).to eq(2)

    api :get, "/staff/occurrences?days=99"
    expect(response).to have_http_status(:bad_request)
  end

  it "keeps programs inside their organization" do
    foreign = create_program(ironworks, location: create_location(ironworks))

    api :get, "/staff/programs/#{foreign.id}"
    expect(response).to have_http_status(:not_found)

    api :post, "/staff/programs", body: program_body.merge(location_id: ironworks.locations.first.id)
    expect(response).to have_http_status(:unprocessable_content)
  end

  describe "permissions", workos: true, demo: false do
    let(:user) { staff_user("user_program_reader") }
    let(:token) { workos_token(workos_claims(user:, organization: chainsaw, permissions: %w[programs:read], role: "receptionist")) }

    it "needs programs:manage to change programs" do
      program = create_program(chainsaw, location: bangsar)

      api :get, "/staff/programs/#{program.id}", token: token
      expect(response).to have_http_status(:ok)

      api :post, "/staff/programs", token:, body: program_body
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/programs/#{program.id}/occurrences", token:, body: { date: Date.current.iso8601, time: "07:00" }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/programs/#{program.id}/tickets", token:, body: { label: "Drop-in", amount_minor: 100 }
      expect(response).to have_http_status(:forbidden)
      api :post, "/staff/occurrences/#{program.occurrences.first.id}/cancel", token:, body: { reason: "No" }
      expect(response).to have_http_status(:forbidden)
    end
  end
end
