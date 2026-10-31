module Public
  # /public/*: no token. Only published organizations and available offers.
  class BaseController < ApplicationController
    include OrganizationScoped

    limit_requests to: 300, within: 1.minute

    private
      def current_organization
        @current_organization ||= find_organization(Organization.published)
      end
  end
end
