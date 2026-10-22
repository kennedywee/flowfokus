# Signs test access tokens shaped like WorkOS AuthKit tokens, and serves their
# public key as the JWKS. No spec calls WorkOS or the emulator.
module WorkosHelpers
  CLIENT_ID = "client_test_123".freeze
  ISSUER = "https://api.workos.com/user_management/#{CLIENT_ID}".freeze
  KID = "test_key_1".freeze

  def self.signing_key = @signing_key ||= OpenSSL::PKey::RSA.generate(2048)
  def self.other_key = @other_key ||= OpenSSL::PKey::RSA.generate(2048)

  def self.public_jwk(key = signing_key, kid: KID)
    JWT::JWK.new(key.public_key, kid:).export.transform_keys(&:to_s).merge("alg" => "RS256", "use" => "sig")
  end

  def stub_workos_jwks(*jwks)
    jwks = [ WorkosHelpers.public_jwk ] if jwks.empty?
    allow(Flowfokus::WorkosTokens::Jwks).to receive(:download).and_return({ "keys" => jwks })
  end

  def workos_claims(user:, organization:, permissions: [], role: "owner", **overrides)
    now = Time.current.to_i
    {
      "sub" => user.workos_id, "sid" => "session_#{SecureRandom.hex(6)}", "jti" => SecureRandom.hex(8),
      "org_id" => organization&.workos_id, "role" => role, "roles" => [ role ], "permissions" => permissions,
      "client_id" => CLIENT_ID, "aud" => CLIENT_ID, "iss" => ISSUER, "iat" => now, "exp" => now + 300
    }.merge(overrides.transform_keys(&:to_s)).compact
  end

  def workos_token(claims, key: WorkosHelpers.signing_key, kid: KID, algorithm: "RS256")
    JWT.encode(claims, key, algorithm, { kid: })
  end

  def staff_user(workos_id, email: "#{workos_id}@example.test")
    User.find_or_create_by!(workos_id:) { |user| user.assign_attributes(email:, first_name: "Test", last_name: workos_id) }
  end
end

RSpec.configure do |config|
  config.include WorkosHelpers
  config.before { Flowfokus::WorkosTokens::Jwks.clear! }
  config.before(:each, workos: true) { stub_workos_jwks }
end
