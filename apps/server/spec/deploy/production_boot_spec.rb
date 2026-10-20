require "rails_helper"
require "open3"

# Boots real production processes. Slow, but it proves the deploy rules.
RSpec.describe "Production boot and container" do
  let(:root) { Rails.root.to_s }
  let(:production_env) do
    {
      "RAILS_ENV" => "production",
      "SECRET_KEY_BASE" => "0" * 64,
      # Boot must not need a reachable database.
      "DATABASE_URL" => "postgres://nobody:nothing@127.0.0.1:1/flowfokus_production",
      "FLOWFOKUS_DEMO_TOKEN" => "flowfokus-local-demo-token",
      "BOOTSNAP_CACHE_DIR" => Rails.root.join("tmp/cache/production-boot").to_s
    }
  end

  def boot(env)
    Open3.capture2e(env, "bin/rails", "runner", "puts :booted", chdir: root)
  end

  it "refuses to boot with demo mode" do
    output, status = boot(production_env.merge("FLOWFOKUS_DEMO_MODE" => "true"))

    expect(status).not_to be_success
    expect(output).to include("FLOWFOKUS_DEMO_MODE=true is not allowed in production")
  end

  it "boots without demo mode" do
    output, status = boot(production_env.merge("FLOWFOKUS_DEMO_MODE" => "false"))

    expect(status).to be_success, output
    expect(output).to include("booted")
  end

  describe "container files" do
    let(:entrypoint) { File.read(File.join(root, "bin/docker-entrypoint")) }
    let(:dockerfile) { File.read(File.join(root, "Dockerfile")) }
    let(:commands) { ->(text) { text.lines.reject { _1.strip.start_with?("#") }.join } }

    it "never migrates or seeds on boot" do
      [ entrypoint, dockerfile ].each do |text|
        expect(commands.(text)).not_to match(/db:(migrate|prepare|seed|setup|schema:load|reset)/)
      end
      expect(commands.(entrypoint).strip.lines.last).to eq('exec "${@}"')
    end

    it "pins production settings and a liveness health check" do
      expect(dockerfile).to include('RAILS_ENV="production"')
      expect(dockerfile).to include('FLOWFOKUS_DEMO_MODE="false"')
      expect(dockerfile).to match(%r{HEALTHCHECK .*\n.*127\.0\.0\.1:3000/up})
      expect(dockerfile).to include("USER 1000:1000")
    end
  end
end
