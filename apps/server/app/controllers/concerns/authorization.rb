# Permissions come only from verified token claims for the active organization.
module Authorization
  extend ActiveSupport::Concern

  private
    def permitted?(permission) = Current.permissions.to_a.include?(permission)

    def require_permission!(permission)
      return if permitted?(permission)

      raise ErrorResponses::RequestError.new(:forbidden, "forbidden", "This action needs the #{permission} permission.")
    end
end
