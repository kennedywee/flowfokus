module MemberArea
  # /member/*: a verified user token and a Member in the organization linked to
  # that user. Staff permissions never apply here, even for a person who is
  # also staff. The demo actor is staff only.
  class BaseController < ApplicationController
    include OrganizationScoped
    include Authentication

    before_action :authenticate_member!

    private
      def authenticate_member!
        authenticate_user!
        member = Current.organization.members.find_by(user: Current.user) ||
          fail_auth!(:forbidden, "member_not_linked",
            "Your sign-in is not linked to a member of #{Current.organization.name} yet. Enter the code from the front desk.")

        Current.member = member
      end

      # The person, with no member yet. Used by the link step too.
      def authenticate_user!
        claims = verified_claims!
        fail_auth!(:forbidden, "forbidden", "Demo actors are staff only and have no member access.") if claims.demo?

        Current.audience = :member
        Current.organization = find_organization
        Current.user = member_user_for!(claims)
        Current.permissions = [].freeze
      end

      # Members are not staff, so a reconcile run may not have imported them.
      # A verified token proves the WorkOS user exists, so fetch it once.
      def member_user_for!(claims)
        unless User.exists?(workos_id: claims.user_workos_id)
          data = WorkosSynced.fetched!(Flowfokus::WorkosApi.from_env.user(claims.user_workos_id), claims.user_workos_id)
          User.transaction { User.sync_from_workos!(data, authoritative: true) }
        end
        user_for!(claims)
      rescue Flowfokus::WorkosApi::Unavailable, Flowfokus::WorkosApi::Error, Flowfokus::WorkosApi::NotFound
        fail_auth!(:service_unavailable, "auth_unavailable", "Your account could not be loaded from WorkOS. Try again in a moment.")
      end
  end
end
