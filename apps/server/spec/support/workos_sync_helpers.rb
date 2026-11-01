# WorkOS event and API data for sync specs. Shapes follow the WorkOS event docs
# and WorkOS Emulate 0.16.0. No spec calls WorkOS or the emulator.
module WorkosSyncHelpers
  WEBHOOK_SECRET = "whsec_test_0123456789abcdef".freeze

  def workos_time(time) = time.utc.iso8601(3)

  def workos_user_data(id, email: "#{id}@example.test", first_name: "First", last_name: "Last", updated_at: Time.current)
    { "object" => "user", "id" => id, "email" => email, "first_name" => first_name, "last_name" => last_name,
      "email_verified" => true, "created_at" => workos_time(1.day.ago), "updated_at" => workos_time(updated_at) }
  end

  def workos_organization_data(id, name: "Remote Name", updated_at: Time.current)
    { "object" => "organization", "id" => id, "name" => name, "domains" => [], "external_id" => nil,
      "created_at" => workos_time(1.day.ago), "updated_at" => workos_time(updated_at) }
  end

  def workos_membership_data(id, user_id:, organization_id:, role: "owner", status: "active", updated_at: Time.current)
    { "object" => "organization_membership", "id" => id, "user_id" => user_id, "organization_id" => organization_id,
      "status" => status, "role" => { "slug" => role }, "roles" => [ { "slug" => role } ],
      "directory_managed" => false, "custom_attributes" => {},
      "created_at" => workos_time(1.day.ago), "updated_at" => workos_time(updated_at) }
  end

  def workos_event_body(event, data, id: "event_#{SecureRandom.hex(8)}", created_at: Time.current)
    { "id" => id, "event" => event, "data" => data, "created_at" => workos_time(created_at), "context" => {} }.to_json
  end

  # Saves an event as the webhook would, then processes it. Returns the event.
  def deliver_workos_event(event, data, api: nil, **options)
    record, = WorkosEvent.accept!(workos_event_body(event, data, **options))
    record.process!(api:)
  end

  def sign_webhook(body, secret: WEBHOOK_SECRET, at: Time.current)
    Flowfokus::WorkosWebhooks.sign(body, secret:, at:)
  end

  # In-memory stand-in for Flowfokus::WorkosApi. Records calls.
  class FakeWorkosApi
    attr_reader :organizations, :users, :memberships, :invitations_by_id, :calls
    attr_accessor :fail_on, :role_list

    def initialize
      @organizations = {}
      @users = {}
      @memberships = {}
      @invitations_by_id = {}
      @role_list = []
      @calls = []
    end

    def roles(_organization_id)
      record(:roles)
      @role_list
    end

    def invitation(id) = fetch(:invitation, @invitations_by_id, id)

    def invitations(organization_id)
      record(:invitations)
      @invitations_by_id.values.select { _1["organization_id"] == organization_id }
    end

    def create_invitation(email:, organization_id:, role_slug:, inviter_user_id: nil)
      record(:create_invitation)
      id = "invitation_#{SecureRandom.hex(6)}"
      @invitations_by_id[id] = { "id" => id, "email" => email, "organization_id" => organization_id, "role_slug" => role_slug,
        "state" => "pending", "inviter_user_id" => inviter_user_id, "expires_at" => 3.days.from_now.iso8601,
        "accept_invitation_url" => "https://auth.example.test/invite?token=#{id}" }
    end

    def revoke_invitation(id)
      record(:revoke_invitation)
      @invitations_by_id.fetch(id)["state"] = "revoked"
      @invitations_by_id[id]
    end

    def update_membership_role(id, role_slug)
      record(:update_membership_role)
      membership = @memberships.fetch(id)
      membership.merge!("role" => { "slug" => role_slug }, "updated_at" => (Time.current + 1.second).iso8601(3))
    end

    def delete_membership(id)
      record(:delete_membership)
      @memberships.delete(id)
      {}
    end

    def organization(id) = fetch(:organization, @organizations, id)
    def user(id) = fetch(:user, @users, id)
    def organization_membership(id) = fetch(:organization_membership, @memberships, id)

    def organization_users(organization_id)
      record(:organization_users)
      user_ids = @memberships.values.select { _1["organization_id"] == organization_id }.map { _1["user_id"] }
      @users.values_at(*user_ids).compact.uniq
    end

    def organization_memberships(organization_id)
      record(:organization_memberships)
      @memberships.values.select { _1["organization_id"] == organization_id }
    end

    private
      def record(name)
        @calls << name
        raise Flowfokus::WorkosApi::Unavailable, "WorkOS answered 503 for #{name}." if fail_on == name
      end

      def fetch(name, store, id)
        record(name)
        store.fetch(id) { raise Flowfokus::WorkosApi::NotFound, "WorkOS has no #{name} #{id}." }
      end
  end
end

RSpec.configure { |config| config.include WorkosSyncHelpers }
