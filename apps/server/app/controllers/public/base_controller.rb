module Public
  # /public/*: no token. Only published organizations and available offers.
  class BaseController < ApplicationController
    include OrganizationScoped

    private
      def current_organization
        @current_organization ||= find_organization(Organization.published)
      end
  end
end
