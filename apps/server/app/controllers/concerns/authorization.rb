# Permissions come only from verified token claims for the active organization.
module Authorization
  extend ActiveSupport::Concern

  private
    def require_permission!(permission)
      return if Current.permissions.to_a.include?(permission)

      raise ErrorResponses::RequestError.new(:forbidden, "forbidden", "This action needs the #{permission} permission.")
    end
end
