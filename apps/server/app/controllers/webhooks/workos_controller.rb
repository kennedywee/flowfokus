module Webhooks
  # POST /webhooks/workos: signed WorkOS events.
  #
  # Checks the WorkOS-Signature header against the raw body before it reads
  # any JSON. Saves the event to the ledger, queues processing, and answers 200.
  # A redelivered event answers 200 again and changes nothing.
  # No Bearer token and no organization header: the signature is the credential.
  class WorkosController < ApplicationController
    MAX_BODY_BYTES = 1.megabyte

    rescue_from Flowfokus::WorkosWebhooks::Unavailable do |error|
      render_error :service_unavailable, "webhook_not_configured", error.message
    end
    rescue_from Flowfokus::WorkosWebhooks::InvalidSignature do |error|
      render_error :bad_request, "invalid_signature", error.message
    end
    rescue_from WorkosEvent::Malformed do |error|
      render_error :bad_request, "bad_request", error.message
    end

    def create
      secret = Flowfokus::WorkosWebhooks.secret!
      if request.content_length.to_i > MAX_BODY_BYTES
        return render_error(:content_too_large, "payload_too_large", "The webhook body is larger than #{MAX_BODY_BYTES} bytes.")
      end

      body = request.raw_post.to_s
      Flowfokus::WorkosWebhooks.verify!(body, request.headers["WorkOS-Signature"], secret:)

      event, duplicate = WorkosEvent.accept!(body)
      enqueue(event) if event.status == "pending"
      render_data event.as_webhook_api(duplicate:)
    end

    private
      # The event is already saved. If queueing fails, it stays pending for the retry command.
      def enqueue(event)
        WorkosEventJob.perform_later(event)
      rescue StandardError => error
        Rails.logger.error("Could not queue WorkOS event #{event.workos_id}: #{error.class}: #{error.message}")
      end
  end
end
