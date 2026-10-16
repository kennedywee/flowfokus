class HealthController < ApplicationController
  # Liveness: the process answers. Never touches the database.
  def live
    render_data({ status: "ok" })
  end

  # Readiness: the database answers a query.
  def ready
    ActiveRecord::Base.connection_pool.with_connection { |connection| connection.select_value("SELECT 1") }
    render_data({ status: "ok" })
  rescue StandardError => error
    Rails.logger.warn("Readiness check failed: #{error.class}: #{error.message}")
    render_error :service_unavailable, "database_unavailable", "The database is not available."
  end
end
