require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
abort("The Rails environment is running in production mode!") if Rails.env.production?

database = ActiveRecord::Base.connection_db_config.database.to_s
abort("Refusing to run specs against #{database.inspect}. The database name must end in _test.") unless database.end_with?("_test")

require "rspec/rails"

Rails.root.glob("spec/support/**/*.rb").sort.each { |file| require file }

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => error
  abort error.to_s.strip
end

RSpec.configure do |config|
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
  config.include ActiveSupport::Testing::TimeHelpers
end

# Runs a statement that should fail inside a savepoint, so the test transaction survives.
def in_savepoint(&)
  ActiveRecord::Base.transaction(requires_new: true, &)
end
