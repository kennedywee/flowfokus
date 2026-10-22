require "json"
require "net/http"

module Flowfokus
  # Read-only client for the WorkOS REST API. Sync uses it to fetch users,
  # organizations, and memberships. It never changes anything in WorkOS.
  #
  # Settings:
  # - WORKOS_API_KEY: secret key, sent as a Bearer token.
  # - WORKOS_API_BASE_URL: development and test only, for example
  #   http://workos:4100 for WorkOS Emulate. Production always uses
  #   https://api.workos.com and refuses any other value.
  class WorkosApi
    # Missing settings, network failure, rate limit, or a 5xx answer. Safe to retry.
    class Unavailable < StandardError; end
    # WorkOS answered 404 for one record.
    class NotFound < StandardError; end
    # Any other unexpected answer.
    class Error < StandardError; end

    OFFICIAL_BASE_URL = "https://api.workos.com".freeze
    PAGE_LIMIT = 100
    MAX_PAGES = 1_000
    MEMBERSHIP_STATUSES = %w[active inactive pending].freeze
    OPEN_TIMEOUT = 5
    READ_TIMEOUT = 15

    attr_reader :base_url

    def self.from_env(env: ENV, rails_env: Rails.env)
      api_key = env["WORKOS_API_KEY"].to_s.strip
      raise Unavailable, "WORKOS_API_KEY is not set." if api_key.empty?

      base_url = env["WORKOS_API_BASE_URL"].presence&.strip&.chomp("/") || OFFICIAL_BASE_URL
      if rails_env.to_s == "production"
        raise Unavailable, "WORKOS_API_BASE_URL must be #{OFFICIAL_BASE_URL} in production." unless base_url == OFFICIAL_BASE_URL
        raise Unavailable, "WorkOS is not verified for this environment yet. Sync stays turned off." unless env["WORKOS_VERIFIED"] == "true"
      end

      new(api_key:, base_url:)
    end

    def initialize(api_key:, base_url: OFFICIAL_BASE_URL)
      @api_key = api_key
      @base_url = base_url
    end

    def organization(id) = get("/organizations/#{escape(id)}")
    def user(id) = get("/user_management/users/#{escape(id)}")
    def organization_membership(id) = get("/user_management/organization_memberships/#{escape(id)}")

    # Every user with a membership in the organization. Reads all pages first.
    def organization_users(organization_id)
      list("/user_management/users", organization_id:)
    end

    # Every membership of the organization, in every status. WorkOS returns only
    # active memberships unless the request names the statuses.
    def organization_memberships(organization_id)
      list("/user_management/organization_memberships", organization_id:, statuses: MEMBERSHIP_STATUSES.join(","))
    end

    # Follows `list_metadata.after` until the last page. Returns all records, or
    # raises: a partial list is never returned.
    def list(path, **params)
      records = []
      seen = Set.new
      after = nil
      MAX_PAGES.times do
        page = get(path, **params, limit: PAGE_LIMIT, order: "asc", after:)
        data = page["data"]
        raise Error, "WorkOS #{path} returned no data list." unless data.is_a?(Array)

        records.concat(data)
        after = page.dig("list_metadata", "after")
        return records if after.blank?
        raise Error, "WorkOS #{path} repeated a page cursor." unless seen.add?(after)
      end
      raise Error, "WorkOS #{path} has more than #{MAX_PAGES} pages."
    end

    def get(path, **params)
      uri = URI.parse("#{base_url}#{path}")
      query = params.compact
      uri.query = URI.encode_www_form(query) if query.any?

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
        open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) do |http|
        http.request(Net::HTTP::Get.new(uri, "Authorization" => "Bearer #{@api_key}", "Accept" => "application/json"))
      end

      case response
      when Net::HTTPSuccess then parse(response.body, path)
      when Net::HTTPNotFound then raise NotFound, "WorkOS has no record at #{path}."
      when Net::HTTPTooManyRequests, Net::HTTPServerError then raise Unavailable, "WorkOS answered #{response.code} for #{path}."
      when Net::HTTPUnauthorized, Net::HTTPForbidden then raise Unavailable, "WorkOS rejected the API key (#{response.code})."
      else raise Error, "WorkOS answered #{response.code} for #{path}."
      end
    rescue SystemCallError, IOError, Timeout::Error, SocketError, OpenSSL::SSL::SSLError => error
      raise Unavailable, "WorkOS is not reachable (#{error.class})."
    end

    private
      def parse(body, path)
        document = JSON.parse(body.to_s)
        raise Error, "WorkOS #{path} did not return an object." unless document.is_a?(Hash)

        document
      rescue JSON::ParserError
        raise Error, "WorkOS #{path} did not return JSON."
      end

      def escape(id) = ERB::Util.url_encode(id.to_s)
  end
end
