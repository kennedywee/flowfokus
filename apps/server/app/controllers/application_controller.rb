class ApplicationController < ActionController::API
  include ErrorResponses

  # Request bodies are flat JSON objects.
  wrap_parameters false

  # Per-process counters. Cloudflare rate limits stay the first defense.
  RATE_LIMIT_STORE = ActiveSupport::Cache::MemoryStore.new

  after_action :prevent_caching

  # Limits requests per trusted client IP. See Flowfokus::WorkerRequest.
  def self.limit_requests(to:, within:, **)
    rate_limit(to:, within:, by: -> { client_ip }, store: RATE_LIMIT_STORE, **,
      with: -> { render_error :too_many_requests, "rate_limited", "Too many requests. Try again in a minute." })
  end

  private
    # The browser's IP when a Worker proved it, otherwise the connection IP.
    def client_ip = request.env[Flowfokus::WorkerRequest::CLIENT_IP] || request.remote_ip

    def render_data(data, status: :ok)
      render json: { data: }, status:
    end

    def prevent_caching
      response.headers["Cache-Control"] = "private, no-store"
    end
end
