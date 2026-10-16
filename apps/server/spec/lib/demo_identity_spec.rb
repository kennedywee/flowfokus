require "rails_helper"

RSpec.describe Hydraflow::DemoIdentity do
  let(:token) { "hydraflow-local-demo-token" }
  let(:enabled_env) { { "HYDRAFLOW_DEMO_MODE" => "true", "HYDRAFLOW_DEMO_TOKEN" => token } }

  it "is off unless explicitly requested" do
    expect(described_class.enabled?(env: {}, rails_env: "development")).to be(false)
    expect(described_class.enabled?(env: { "HYDRAFLOW_DEMO_MODE" => "1" }, rails_env: "development")).to be(false)
  end

  it "is available in development and test" do
    expect(described_class.enabled?(env: enabled_env, rails_env: "development")).to be(true)
    expect(described_class.enabled?(env: enabled_env, rails_env: "test")).to be(true)
  end

  it "refuses production and any other environment" do
    %w[production staging].each do |rails_env|
      expect { described_class.verify_environment!(env: enabled_env, rails_env:) }
        .to raise_error(described_class::ProductionError, /not allowed in #{rails_env}/)
    end
  end

  it "requires a long token" do
    expect { described_class.verify_environment!(env: { "HYDRAFLOW_DEMO_MODE" => "true", "HYDRAFLOW_DEMO_TOKEN" => "short" }, rails_env: "test") }
      .to raise_error(described_class::TokenError)
  end

  it "maps only the exact token to fixed claims" do
    claims = described_class.claims_for(token, env: enabled_env, rails_env: "test")

    expect(claims).to have_attributes(
      user_workos_id: described_class::USER[:workos_id],
      organization_workos_id: described_class::ORGANIZATION_WORKOS_ID,
      permissions: described_class::PERMISSIONS,
      demo: true
    )
    expect(described_class.claims_for("#{token}x", env: enabled_env, rails_env: "test")).to be_nil
    expect(described_class.claims_for(token, env: {}, rails_env: "test")).to be_nil
  end
end
