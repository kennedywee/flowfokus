class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  # UTC ISO 8601 with milliseconds, for API responses.
  def self.api_time(value) = value&.utc&.iso8601(3)
  def api_time(value) = self.class.api_time(value)
end
