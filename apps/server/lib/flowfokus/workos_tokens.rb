require "ipaddr"
require "jwt"
require "net/http"

module Flowfokus
  # Verifies WorkOS AuthKit access tokens.
  #
  # A token passes only when all of these hold:
  # - The header names RS256. No other algorithm, and never "none".
  # - A key from the configured JWKS, found by `kid`, verifies the signature.
  # - `iss` equals the configured issuer exactly.
  # - `exp` is in the future and `iat` is not in the future (small leeway for clock skew).
  # - `sub` and `sid` are present.
  # - `aud` and `client_id`, when present, name the configured client.
  #
  # Production also requires HTTPS issuer and JWKS URLs on a public host, and
  # WORKOS_VERIFIED=true. Until a person verifies a real WorkOS environment,
  # every production token fails closed with 503.
  module WorkosTokens
    # Configuration or JWKS problem. The request fails with 503.
    class Unavailable < StandardError; end
    # The token is not acceptable. The request fails with 401.
    class Invalid < StandardError; end

    ALGORITHMS = %w[RS256].freeze
    DEFAULT_API_BASE = "https://api.workos.com".freeze
    LEEWAY_SECONDS = 5
    REQUIRED_CLAIMS = %w[sub sid iss exp iat].freeze

    Config = Data.define(:client_id, :issuer, :jwks_url)

    module_function

    def configured?(env: ENV)
      env["WORKOS_CLIENT_ID"].present?
    end

    # The verified settings. Raises Unavailable when they are missing or unsafe.
    def config!(env: ENV, rails_env: Rails.env)
      client_id = env["WORKOS_CLIENT_ID"].to_s.strip
      raise Unavailable, "WORKOS_CLIENT_ID is not set." if client_id.empty?

      issuer = env["WORKOS_ISSUER"].presence&.strip || "#{DEFAULT_API_BASE}/user_management/#{client_id}"
      jwks_url = env["WORKOS_JWKS_URL"].presence&.strip || "#{DEFAULT_API_BASE}/sso/jwks/#{client_id}"

      if rails_env.to_s == "production"
        unless public_https_url?(issuer) && public_https_url?(jwks_url)
          raise Unavailable, "WORKOS_ISSUER and WORKOS_JWKS_URL must be public HTTPS URLs in production."
        end
        unless env["WORKOS_VERIFIED"] == "true"
          raise Unavailable, "WorkOS sign-in is not verified for this environment yet. Protected actions stay turned off."
        end
      end

      Config.new(client_id:, issuer:, jwks_url:)
    end

    # Returns IdentityClaims, or raises Invalid or Unavailable.
    def verify!(bearer, env: ENV, rails_env: Rails.env)
      config = config!(env:, rails_env:)
      payload, = JWT.decode(
        bearer.to_s, nil, true,
        algorithms: ALGORITHMS,
        jwks: Jwks.loader(config.jwks_url),
        iss: config.issuer, verify_iss: true,
        verify_expiration: true, leeway: LEEWAY_SECONDS, verify_iat: { leeway: LEEWAY_SECONDS },
        required_claims: REQUIRED_CLAIMS
      )
      check_client!(payload, config.client_id)

      IdentityClaims.new(
        user_workos_id: string_claim!(payload, "sub"),
        organization_workos_id: payload["org_id"].is_a?(String) ? payload["org_id"].presence : nil,
        permissions: Array(payload["permissions"]).grep(String).uniq.freeze,
        role: payload["role"].is_a?(String) ? payload["role"] : nil,
        demo: false
      )
    rescue JWT::ExpiredSignature
      raise Invalid, "The access token has expired."
    rescue JWT::DecodeError
      raise Invalid, "The Bearer token is not valid."
    end

    def check_client!(payload, client_id)
      if payload.key?("aud") && !Array(payload["aud"]).include?(client_id)
        raise Invalid, "The access token was issued for another client."
      end
      if payload.key?("client_id") && payload["client_id"] != client_id
        raise Invalid, "The access token was issued for another client."
      end
    end

    def string_claim!(payload, name)
      value = payload[name]
      raise Invalid, "The Bearer token is not valid." unless value.is_a?(String) && value.present?

      value
    end

    def public_https_url?(url)
      uri = URI.parse(url)
      host = uri.host.to_s.downcase
      uri.is_a?(URI::HTTPS) && host.include?(".") && !host.end_with?(".localhost") && !ip_address?(host)
    rescue URI::InvalidURIError
      false
    end

    def ip_address?(host)
      IPAddr.new(host.delete_prefix("[").delete_suffix("]"))
      true
    rescue IPAddr::InvalidAddressError
      false
    end

    # In-process JWKS cache. Refetches after a TTL, and on an unknown `kid`
    # at most once per cooldown, so a forged `kid` cannot flood WorkOS.
    module Jwks
      TTL = 10.minutes
      REFETCH_COOLDOWN = 30.seconds
      OPEN_TIMEOUT = 3
      READ_TIMEOUT = 5

      @mutex = Mutex.new
      @cache = {}

      class << self
        def loader(url)
          lambda do |options|
            keys(url, force: options[:kid_not_found])
          end
        end

        def keys(url, force: false)
          @mutex.synchronize do
            entry = @cache[url]
            now = Time.current
            stale = entry.nil? || now - entry[:fetched_at] > TTL
            refetch = force && entry && now - entry[:fetched_at] > REFETCH_COOLDOWN
            @cache[url] = { set: build_set(download(url)), fetched_at: now } if stale || refetch
            @cache[url][:set]
          end
        end

        def clear!
          @mutex.synchronize { @cache.clear }
        end

        # Returns the parsed JWKS document. Raises Unavailable on any failure.
        def download(url)
          uri = URI.parse(url)
          response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
            open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
            http.request(Net::HTTP::Get.new(uri, "Accept" => "application/json"))
          end
          raise Unavailable, "The WorkOS JWKS answered #{response.code}." unless response.is_a?(Net::HTTPSuccess)

          JSON.parse(response.body)
        rescue JSON::ParserError
          raise Unavailable, "The WorkOS JWKS is not valid JSON."
        rescue SystemCallError, IOError, Timeout::Error, SocketError, OpenSSL::SSL::SSLError, URI::InvalidURIError => error
          raise Unavailable, "The WorkOS JWKS is not reachable (#{error.class})."
        end

        def build_set(document)
          keys = Array(document.is_a?(Hash) ? document["keys"] : nil).select do |key|
            key.is_a?(Hash) && key["kty"] == "RSA" && key["kid"].present? &&
              (key["use"].nil? || key["use"] == "sig") && (key["alg"].nil? || key["alg"] == "RS256")
          end
          raise Unavailable, "The WorkOS JWKS has no usable RS256 keys." if keys.empty?

          JWT::JWK::Set.new({ "keys" => keys })
        end
      end
    end
  end
end
