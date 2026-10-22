module Staff
  # /staff/*: a verified staff token whose organization claim matches the slug.
  class BaseController < ApplicationController
    include OrganizationScoped
    include Authentication
    include Authorization

    before_action :authenticate_staff!

    private
      def authenticate_staff!
        claims = verified_claims!
        organization = find_organization
        unless organization.workos_id.present? && organization.workos_id == claims.organization_workos_id
          fail_auth! :forbidden, "organization_mismatch", "This session has no staff access to this organization."
        end

        Current.audience = :staff
        Current.organization = organization
        Current.user = user_for!(claims)
        Current.permissions = claims.permissions.dup.freeze
        Current.demo = claims.demo?
        OrganizationMembership.observe!(organization:, user: Current.user, role: claims.role) unless claims.demo?
      end

      def current_organization = Current.organization

      def idempotency_key!
        key = request.headers["Idempotency-Key"]
        if key.blank?
          raise ErrorResponses::RequestError.new(:bad_request, "idempotency_key_required", "Send an Idempotency-Key header.")
        end
        unless Idempotent.valid_key?(key)
          raise ErrorResponses::RequestError.new(:bad_request, "bad_request", "Idempotency-Key must be 8 to 255 printable ASCII characters.")
        end

        key
      end

      def created_or_replayed(created) = created ? :created : :ok
  end
end
