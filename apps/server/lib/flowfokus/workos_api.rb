require "json"
require "net/http"

module Flowfokus
  # Client for the WorkOS REST API. Sync uses it to fetch users,
  # organizations, and memberships. Staff management (Team) uses it to invite
  # staff, change roles, and remove access. WorkOS stays the authority; webhooks
  # then update the local copy.
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
    # WorkOS rejected a write, for example an invalid email or an existing invitation.
    class Rejected < StandardError; end

    OFFICIAL_BASE_URL = "https://api.workos.com".freeze
    PAGE_LIMIT = 100
    MAX_PAGES = 1_000
    MEMBERSHIP_STATUSES = %w[active inactive pending].freeze
    # WorkOS page cursors are object IDs.
    CURSOR_FORMAT = /\A[A-Za-z0-9_\-]{1,255}\z/
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

    def invitation(id) = get("/user_management/invitations/#{escape(id)}")

    # Environment roles, plus custom roles of this organization, by slug. An
    # organization role replaces an environment role with the same slug.
    def roles(organization_id)
      environment = get("/authorization/roles").fetch("data", [])
      custom = begin
        get("/authorization/organizations/#{escape(organization_id)}/roles").fetch("data", [])
      rescue NotFound
        []
      end
      roles = (environment + custom).select { _1.is_a?(Hash) && _1["slug"].is_a?(String) }
      roles.index_by { _1["slug"] }.values
    end

    def invitations(organization_id) = list("/user_management/invitations", organization_id:)

    def create_invitation(email:, organization_id:, role_slug:, inviter_user_id: nil)
      request(Net::HTTP::Post, "/user_management/invitations",
        body: { email:, organization_id:, role_slug:, inviter_user_id: }.compact)
    end

    def revoke_invitation(id) = request(Net::HTTP::Post, "/user_management/invitations/#{escape(id)}/revoke")

    def update_membership_role(id, role_slug)
      request(Net::HTTP::Put, "/user_management/organization_memberships/#{escape(id)}", body: { role_slug: })
    end

    def delete_membership(id) = request(Net::HTTP::Delete, "/user_management/organization_memberships/#{escape(id)}")

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
    #
    # Sync treats a record missing from a complete list as deleted, so the end
    # of the list must be explicit. Every page needs a `data` list of objects
    # and a `list_metadata` object with an `after` key. Only `after: null` ends
    # the list. A missing key, a cursor of the wrong shape, a cursor on an empty
    # page, or a repeated cursor raises.
    def list(path, **params)
      records = []
      seen = Set.new
      after = nil
      MAX_PAGES.times do
        page = get(path, **params, limit: PAGE_LIMIT, order: "asc", after:)
        data = page["data"]
        metadata = page["list_metadata"]
        raise Error, "WorkOS #{path} returned no data list." unless data.is_a?(Array) && data.all?(Hash)
        raise Error, "WorkOS #{path} returned no list_metadata.after." unless metadata.is_a?(Hash) && metadata.key?("after")

        records.concat(data)
        after = metadata["after"]
        return records if after.nil?
        raise Error, "WorkOS #{path} returned an invalid page cursor." unless after.is_a?(String) && CURSOR_FORMAT.match?(after)
        raise Error, "WorkOS #{path} returned a page cursor for an empty page." if data.empty?
        raise Error, "WorkOS #{path} repeated a page cursor." unless seen.add?(after)
      end
      raise Error, "WorkOS #{path} has more than #{MAX_PAGES} pages."
    end

    def get(path, **params) = request(Net::HTTP::Get, path, params:)

    def request(method, path, params: {}, body: nil)
      uri = URI.parse("#{base_url}#{path}")
      query = params.compact
      uri.query = URI.encode_www_form(query) if query.any?

      http_request = method.new(uri, "Authorization" => "Bearer #{@api_key}", "Accept" => "application/json")
      if body
        http_request["Content-Type"] = "application/json"
        http_request.body = body.to_json
      end
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https",
        open_timeout: OPEN_TIMEOUT, read_timeout: READ_TIMEOUT) { |http| http.request(http_request) }

      case response
      when Net::HTTPNoContent then {}
      when Net::HTTPSuccess then response.body.to_s.strip.empty? ? {} : parse(response.body, path)
      when Net::HTTPBadRequest, Net::HTTPConflict, Net::HTTPUnprocessableEntity
        raise Rejected, rejection_message(response.body)
      when Net::HTTPNotFound then raise NotFound, "WorkOS has no record at #{path}."
      when Net::HTTPTooManyRequests, Net::HTTPServerError then raise Unavailable, "WorkOS answered #{response.code} for #{path}."
      when Net::HTTPUnauthorized, Net::HTTPForbidden then raise Unavailable, "WorkOS rejected the API key (#{response.code})."
      else raise Error, "WorkOS answered #{response.code} for #{path}."
      end
    rescue SystemCallError, IOError, Timeout::Error, SocketError, OpenSSL::SSL::SSLError => error
      raise Unavailable, "WorkOS is not reachable (#{error.class})."
    end

    private
      def rejection_message(body)
        document = JSON.parse(body.to_s)
        message = document["message"] if document.is_a?(Hash)
        message.is_a?(String) && message.present? ? "WorkOS refused the change: #{message.truncate(200)}" : "WorkOS refused the change."
      rescue JSON::ParserError
        "WorkOS refused the change."
      end

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
