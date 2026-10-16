module MemberArea
  # /member/*: a verified user token and a Member in the organization linked to
  # that user. Staff permissions never apply here. Fails closed in Sprint 1
  # because WorkOS verification is not implemented.
  class BaseController < ApplicationController
    include OrganizationScoped
    include Authentication

    before_action :authenticate_member!

    private
      def authenticate_member!
        claims = verified_claims!
        if claims.demo?
          fail_auth! :forbidden, "forbidden", "Demo actors are staff only and have no member access."
        end

        organization = find_organization
        user = user_for!(claims)
        member = organization.members.find_by(user:) ||
          fail_auth!(:forbidden, "forbidden", "No member of this organization is linked to this user.")

        Current.audience = :member
        Current.organization = organization
        Current.user = user
        Current.member = member
        Current.permissions = [].freeze
      end
  end
end
