require "rails_helper"

RSpec.describe Flowfokus::WorkosTokens do
  def config(env, rails_env: "development") = described_class.config!(env:, rails_env:)

  it "derives the WorkOS issuer and JWKS from the client ID" do
    expect(config({ "WORKOS_CLIENT_ID" => "client_1" })).to have_attributes(
      issuer: "https://api.workos.com/user_management/client_1",
      jwks_url: "https://api.workos.com/sso/jwks/client_1"
    )
  end

  it "takes explicit local settings in development" do
    settings = config({ "WORKOS_CLIENT_ID" => "client_1", "WORKOS_ISSUER" => "http://localhost:4100/user_management/client_1",
      "WORKOS_JWKS_URL" => "http://workos:4100/sso/jwks/client_1" })

    expect(settings.jwks_url).to eq("http://workos:4100/sso/jwks/client_1")
  end

  it "needs a client ID" do
    expect { config({}) }.to raise_error(described_class::Unavailable)
  end

  describe "in production" do
    let(:verified) { { "WORKOS_CLIENT_ID" => "client_1", "WORKOS_VERIFIED" => "true" } }

    it "needs WORKOS_VERIFIED=true" do
      expect { config(verified.except("WORKOS_VERIFIED"), rails_env: "production") }.to raise_error(described_class::Unavailable, /not verified/)
      expect(config(verified, rails_env: "production").client_id).to eq("client_1")
    end

    it "allows a custom HTTPS auth domain" do
      settings = config(verified.merge("WORKOS_ISSUER" => "https://auth.flowfokus.com/user_management/client_1",
        "WORKOS_JWKS_URL" => "https://auth.flowfokus.com/sso/jwks/client_1"), rails_env: "production")

      expect(settings.issuer).to start_with("https://auth.flowfokus.com")
    end

    [
      "http://api.workos.com/sso/jwks/client_1",
      "https://localhost:4100/sso/jwks/client_1",
      "https://workos:4100/sso/jwks/client_1",
      "https://workos.localhost/sso/jwks/client_1",
      "https://127.0.0.1/sso/jwks/client_1",
      "https://[::1]/sso/jwks/client_1"
    ].each do |url|
      it "refuses #{url}" do
        expect { config(verified.merge("WORKOS_JWKS_URL" => url), rails_env: "production") }
          .to raise_error(described_class::Unavailable, /public HTTPS/)
      end
    end
  end
end
