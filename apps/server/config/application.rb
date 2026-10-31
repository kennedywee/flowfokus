require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"

Bundler.require(*Rails.groups)

require_relative "../lib/flowfokus/worker_request"

module Flowfokus
  class Application < Rails::Application
    config.load_defaults 8.1

    # The Worker middleware loads before autoloading, so it is required above.
    config.autoload_lib(ignore: %w[assets tasks flowfokus/worker_request.rb])

    config.api_only = true
    # Runs after RemoteIp, so the connection IP is known. See Flowfokus::WorkerRequest.
    config.middleware.insert_after ActionDispatch::RemoteIp, Flowfokus::WorkerRequest
    config.time_zone = "UTC"
    config.active_record.default_timezone = :utc
    # db/schema.rb is the schema format (project preference). Composite foreign keys,
    # check and exclusion constraints dump natively; Fx dumps functions and triggers.

    config.generators do |g|
      g.orm :active_record, primary_key_type: :uuid
      g.test_framework :rspec
    end
  end
end
