# Resolves the organization named by the Flowfokus-Organization header.
# The slug only chooses which organization to check. It never grants access.
module OrganizationScoped
  extend ActiveSupport::Concern

  HEADER = "Flowfokus-Organization".freeze

  private
    def organization_slug
      slug = request.headers[HEADER].to_s.strip
      raise ErrorResponses::RequestError.new(:bad_request, "organization_required", "Send the #{HEADER} header with the gym slug.") if slug.empty?

      slug
    end

    def find_organization(scope = Organization.all)
      scope.find_by_slug(organization_slug) ||
        raise(ErrorResponses::RequestError.new(:not_found, "not_found", "The organization was not found."))
    end
end
