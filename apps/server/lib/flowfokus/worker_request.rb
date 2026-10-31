require "ipaddr"

module Flowfokus
  # Rack middleware. Decides which client IP Rails may trust.
  #
  # Every web request reaches Rails through a portal or site Worker, so the
  # connection IP is Cloudflare's. The Worker sends the browser's IP in
  # Flowfokus-Client-IP, with Flowfokus-Worker-Secret to prove that it sent it.
  #
  # - A valid secret: trust Flowfokus-Client-IP when it is a valid IP address.
  # - Anything else: ignore that header and use the connection IP. Mobile
  #   requests take this path.
  #
  # The secret never authenticates a user. The Bearer token still decides that.
  # WORKER_SECRET_PREVIOUS keeps the old value valid for one deploy during rotation.
  class WorkerRequest
    SECRET_HEADER = "HTTP_FLOWFOKUS_WORKER_SECRET".freeze
    CLIENT_IP_HEADER = "HTTP_FLOWFOKUS_CLIENT_IP".freeze
    SECRET_VARIABLES = %w[WORKER_SECRET WORKER_SECRET_PREVIOUS].freeze
    MIN_SECRET_LENGTH = 32

    WORKER = "flowfokus.worker".freeze
    CLIENT_IP = "flowfokus.client_ip".freeze

    def self.secrets(env: ENV)
      SECRET_VARIABLES.filter_map { env[_1].to_s.strip.presence }.select { _1.length >= MIN_SECRET_LENGTH }
    end

    def self.trusted_secret?(value, env: ENV)
      value = value.to_s
      value.present? && secrets(env:).any? { ActiveSupport::SecurityUtils.secure_compare(value, _1) }
    end

    def self.ip_address(value)
      value = value.to_s.strip
      IPAddr.new(value).to_s if value.present? && value.length <= 45 && !value.include?("/")
    rescue IPAddr::Error
      nil
    end

    def initialize(app) = @app = app

    def call(env)
      forwarded = env.delete(CLIENT_IP_HEADER)
      worker = self.class.trusted_secret?(env.delete(SECRET_HEADER))
      client_ip = (self.class.ip_address(forwarded) if worker)

      env[WORKER] = worker
      env[CLIENT_IP] = client_ip || ActionDispatch::Request.new(env).remote_ip
      @app.call(env)
    end
  end
end
