require "openssl"

module Flowfokus
  # Verifies the WorkOS-Signature header of a webhook request.
  #
  # WorkOS sends `WorkOS-Signature: t=<milliseconds>, v1=<hex>`. The signature is
  # HMAC-SHA256, keyed with the endpoint secret, over "<t>.<raw request body>".
  # Rails checks it against the raw body, before it parses any JSON.
  # A timestamp more than TOLERANCE away from now, in either direction, fails.
  #
  # Production also requires WORKOS_VERIFIED=true, like token verification.
  module WorkosWebhooks
    # Missing or unsafe settings. The request fails with 503, so WorkOS retries later.
    class Unavailable < StandardError; end
    # The signature does not prove the request came from WorkOS. The request fails with 400.
    class InvalidSignature < StandardError; end

    SECRET_VARIABLE = "WORKOS_WEBHOOK_SECRET".freeze
    TOLERANCE = 180.seconds
    MIN_SECRET_LENGTH = 16

    module_function

    def secret!(env: ENV, rails_env: Rails.env)
      secret = env[SECRET_VARIABLE].to_s
      raise Unavailable, "#{SECRET_VARIABLE} is not set. WorkOS webhooks are turned off." if secret.empty?
      raise Unavailable, "#{SECRET_VARIABLE} is too short." if secret.length < MIN_SECRET_LENGTH
      if rails_env.to_s == "production" && env["WORKOS_VERIFIED"] != "true"
        raise Unavailable, "WorkOS is not verified for this environment yet. Webhooks stay turned off."
      end

      secret
    end

    # Raises InvalidSignature unless the header signs this exact body.
    def verify!(body, header, secret:, now: Time.current)
      timestamp, signatures = parse(header)
      issued_at = Time.at(timestamp.to_i / 1000.0)
      if (now - issued_at).abs > TOLERANCE
        raise InvalidSignature, "The webhook timestamp is outside the allowed window."
      end

      expected = OpenSSL::HMAC.hexdigest("SHA256", secret, "#{timestamp}.#{body}")
      unless signatures.any? { |signature| ActiveSupport::SecurityUtils.secure_compare(signature, expected) }
        raise InvalidSignature, "The webhook signature does not match."
      end

      true
    end

    # Test and tooling helper: the header WorkOS would send for this body.
    def sign(body, secret:, at: Time.current)
      timestamp = (at.to_r * 1000).to_i
      "t=#{timestamp}, v1=#{OpenSSL::HMAC.hexdigest('SHA256', secret, "#{timestamp}.#{body}")}"
    end

    def parse(header)
      raise InvalidSignature, "Send the WorkOS-Signature header." if header.blank?

      pairs = header.to_s.split(",").map { |part| part.strip.split("=", 2) }
      timestamp = pairs.find { |key, _| key == "t" }&.last
      signatures = pairs.select { |key, value| key == "v1" && value.to_s.match?(/\A\h{64}\z/) }.map { |_, value| value.downcase }
      unless timestamp.to_s.match?(/\A\d{1,15}\z/) && signatures.any?
        raise InvalidSignature, "The WorkOS-Signature header is malformed."
      end

      # Sign the timestamp exactly as sent.
      [ timestamp, signatures ]
    end
  end
end
