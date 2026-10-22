module EnvHelpers
  DEMO_TOKEN = "flowfokus-test-demo-token".freeze

  # Sets environment variables for the block and restores them afterwards.
  def with_env(values)
    previous = values.keys.to_h { |key| [ key, ENV[key] ] }
    values.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    yield
  ensure
    previous&.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end
end

RSpec.configure do |config|
  config.include EnvHelpers

  # Request specs run with the local demo actor unless an example says otherwise.
  # `workos: true` turns on WorkOS verification with the test client and the
  # default (production-shaped) issuer and JWKS URL. Every WORKOS_* value is set
  # here, so settings from a Compose container never leak into a spec.
  config.around(:each, type: :request) do |example|
    demo = example.metadata.fetch(:demo, true)
    with_env(
      "FLOWFOKUS_DEMO_MODE" => demo ? "true" : nil,
      "FLOWFOKUS_DEMO_TOKEN" => demo ? EnvHelpers::DEMO_TOKEN : nil,
      "WORKOS_CLIENT_ID" => example.metadata[:workos] ? WorkosHelpers::CLIENT_ID : nil,
      "WORKOS_ISSUER" => nil,
      "WORKOS_JWKS_URL" => nil,
      "WORKOS_VERIFIED" => nil
    ) { example.run }
  end
end
