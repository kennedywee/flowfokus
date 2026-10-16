# Request helpers. Every response is checked against openapi.yaml.
module ApiHelpers
  include Committee::Rails::Test::Methods

  def committee_options
    @committee_options ||= {
      schema: ContractCoverage.schema,
      strict_reference_validation: true,
      parse_response_by_content_type: false
    }
  end

  def api(method, path, organization: "chainsaw", token: EnvHelpers::DEMO_TOKEN, body: nil, key: nil, headers: {})
    request_headers = { "Accept" => "application/json" }
    request_headers["Hydraflow-Organization"] = organization if organization
    request_headers["Authorization"] = "Bearer #{token}" if token
    request_headers["Idempotency-Key"] = key if key
    if body
      request_headers["Content-Type"] = "application/json"
      body = body.is_a?(String) ? body : body.to_json
    end

    public_send(method, path, params: body, headers: request_headers.merge(headers))
    assert_response_schema_confirm(response.status)
    ContractCoverage.record(method, path, response.status)
    response
  end

  def json = response.parsed_body
  def data = json.fetch("data")
  def error_code = json.dig("error", "code")
end

# Fails the full run when an operation or a documented status has no checked response.
module ContractCoverage
  SPEC_PATH = Rails.root.join("openapi.yaml").to_s

  class << self
    def schema
      @schema ||= Committee::Drivers.load_from_file(SPEC_PATH, parser_options: { strict_reference_validation: true })
    end

    def document = @document ||= YAML.load_file(SPEC_PATH)

    def hits = @hits ||= Set.new

    def record(method, path, status)
      template = templates.find { |_, regex| regex.match?(path.split("?").first) }&.first
      hits << [ method.to_s.upcase, template, status.to_s ] if template
    end

    def templates
      @templates ||= document.fetch("paths").keys.to_h do |template|
        [ template, Regexp.new("\\A#{template.gsub(/\{[^}]+\}/, '[^/]+')}\\z") ]
      end
    end

    # Operations and success statuses that never received a checked response.
    def missing_success
      document.fetch("paths").flat_map do |template, operations|
        operations.flat_map do |method, operation|
          operation.fetch("responses").keys.select { |status| status.start_with?("2") }.map do |status|
            [ method.upcase, template, status ]
          end
        end
      end.reject { |entry| hits.include?(entry) }
    end
  end
end

RSpec.configure do |config|
  config.include ApiHelpers, type: :request

  config.after(:suite) do
    request_specs = Rails.root.glob("spec/requests/**/*_spec.rb").map(&:to_s)
    ran_all = (request_specs - RSpec.configuration.files_to_run.map { |file| File.expand_path(file) }).empty?
    skipped = ContractCoverage.missing_success
    # /member/profile has no success path until WorkOS member sessions ship.
    skipped.reject! { |method, template, _| method == "GET" && template == "/member/profile" }
    if ran_all && RSpec.configuration.filter_manager.inclusions.empty? && skipped.any?
      raise "OpenAPI success responses without a checked spec response:\n" + skipped.map { |entry| "  #{entry.join(' ')}" }.join("\n")
    end
  end
end
