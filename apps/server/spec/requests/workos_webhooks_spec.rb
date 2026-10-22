require "rails_helper"

RSpec.describe "POST /webhooks/workos" do
  include ActiveJob::TestHelper

  around do |example|
    adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
  ensure
    ActiveJob::Base.queue_adapter = adapter
  end

  let(:body) { workos_event_body("user.updated", workos_user_data("user_hook", email: "hook@example.test"), id: "event_hook_1") }

  def deliver(raw = body, signature: sign_webhook(raw), headers: {})
    request_headers = { "Content-Type" => "application/json" }
    request_headers["WorkOS-Signature"] = signature if signature
    api :post, "/webhooks/workos", organization: nil, token: nil, body: raw, headers: request_headers.merge(headers)
  end

  it "saves a verified event before processing it, then answers 200" do
    expect { deliver }.to change(WorkosEvent, :count).by(1).and have_enqueued_job(WorkosEventJob)

    expect(response).to have_http_status(:ok)
    expect(json).to eq("data" => { "id" => "event_hook_1", "event" => "user.updated", "status" => "pending", "duplicate" => false })
    event = WorkosEvent.find_by!(workos_id: "event_hook_1")
    expect(event).to have_attributes(status: "pending", event_type: "user.updated", subject_id: "user_hook", attempts: 0)
    expect(event.payload).to eq(JSON.parse(body))
    expect(User.find_by(workos_id: "user_hook")).to be_nil

    perform_enqueued_jobs
    expect(event.reload).to have_attributes(status: "processed", outcome: "created", attempts: 1)
    expect(User.find_by!(workos_id: "user_hook").email).to eq("hook@example.test")
    expect(response.headers["Cache-Control"]).to eq("private, no-store")
  end

  it "answers a redelivery with 200 and changes nothing" do
    deliver
    perform_enqueued_jobs

    expect { deliver }.not_to change(WorkosEvent, :count)
    expect(response).to have_http_status(:ok)
    expect(json["data"]).to include("duplicate" => true, "status" => "processed")
    expect(enqueued_jobs).to be_empty
  end

  it "verifies the signature over the raw body, not re-encoded JSON" do
    spaced = JSON.pretty_generate(JSON.parse(body))

    deliver(spaced)

    expect(response).to have_http_status(:ok)
    expect(WorkosEvent.sole.payload).to eq(JSON.parse(body))
  end

  describe "rejected requests" do
    def expect_rejected(code, status: :bad_request)
      expect(response).to have_http_status(status)
      expect(error_code).to eq(code)
      expect(WorkosEvent.count).to eq(0)
      expect(enqueued_jobs).to be_empty
    end

    it "rejects a missing signature" do
      deliver(signature: nil)
      expect_rejected("invalid_signature")
    end

    it "rejects a body changed after signing" do
      deliver(body.sub("hook@example.test", "evil@example.test"), signature: sign_webhook(body))
      expect_rejected("invalid_signature")
    end

    it "rejects another secret" do
      deliver(signature: sign_webhook(body, secret: "whsec_someone_else_123456"))
      expect_rejected("invalid_signature")
    end

    it "rejects an old timestamp, even with a valid signature" do
      deliver(signature: sign_webhook(body, at: 4.minutes.ago))
      expect_rejected("invalid_signature")
    end

    it "rejects a malformed header" do
      deliver(signature: "v1=abc")
      expect_rejected("invalid_signature")
    end

    it "rejects a signed body that is not a WorkOS event" do
      raw = { "hello" => "world" }.to_json
      deliver(raw)
      expect_rejected("bad_request")

      deliver("not json")
      expect_rejected("bad_request")
    end

    it "rejects a body larger than 1 MB" do
      raw = workos_event_body("user.updated", workos_user_data("user_big").merge("padding" => "x" * 1.megabyte))
      deliver(raw)
      expect_rejected("payload_too_large", status: :content_too_large)
    end

    it "measures the body it reads, not the Content-Length header" do
      raw = workos_event_body("user.updated", workos_user_data("user_big").merge("padding" => "x" * 1.megabyte))
      deliver(raw, headers: { "CONTENT_LENGTH" => "100" })
      expect_rejected("payload_too_large", status: :content_too_large)
    end

    it "fails closed with 503 when no webhook secret is set", webhook_secret: false do
      deliver
      expect_rejected("webhook_not_configured", status: :service_unavailable)
    end

    it "fails closed with 503 in production until WorkOS is verified" do
      allow(Rails).to receive(:env).and_return(ActiveSupport::EnvironmentInquirer.new("production"))
      deliver
      expect_rejected("webhook_not_configured", status: :service_unavailable)
    end

    it "answers 503 database_unavailable when the ledger cannot be reached" do
      allow(WorkosEvent).to receive(:accept!).and_raise(ActiveRecord::ConnectionNotEstablished)
      deliver
      expect_rejected("database_unavailable", status: :service_unavailable)
    end

    it "answers 500 internal_error on an unexpected failure, so WorkOS retries" do
      allow(WorkosEvent).to receive(:accept!).and_raise(StandardError, "boom")
      deliver
      expect_rejected("internal_error", status: :internal_server_error)
      expect(json.dig("error", "message")).to eq("Something went wrong.")
    end
  end

  it "reads the whole signed body when Content-Length understates it, and keeps UTF-8 text" do
    raw = workos_event_body("user.updated", workos_user_data("user_utf8", first_name: "Zoë"), id: "event_utf8")

    deliver(raw, headers: { "CONTENT_LENGTH" => "10" })
    perform_enqueued_jobs

    expect(response).to have_http_status(:ok)
    expect(User.find_by!(workos_id: "user_utf8").first_name).to eq("Zoë")
  end

  it "keeps the saved event pending when queueing fails" do
    allow(WorkosEventJob).to receive(:perform_later).and_raise(StandardError, "queue down")

    deliver

    expect(response).to have_http_status(:ok)
    expect(WorkosEvent.sole.status).to eq("pending")
  end
end
