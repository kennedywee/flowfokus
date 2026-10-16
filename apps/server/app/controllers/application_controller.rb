class ApplicationController < ActionController::API
  include ErrorResponses

  # Request bodies are flat JSON objects.
  wrap_parameters false

  after_action :prevent_caching

  private
    def render_data(data, status: :ok)
      render json: { data: }, status:
    end

    def prevent_caching
      response.headers["Cache-Control"] = "private, no-store"
    end
end
