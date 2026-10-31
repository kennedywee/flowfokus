require "rails_helper"

RSpec.describe Flowfokus::WorkerRequest do
  let(:secret) { "w" * 40 }
  let(:seen) { {} }
  let(:app) do
    inner = ->(env) {
      seen.replace(worker: env["flowfokus.worker"], client_ip: env["flowfokus.client_ip"],
        forwarded: env["HTTP_FLOWFOKUS_CLIENT_IP"], secret: env["HTTP_FLOWFOKUS_WORKER_SECRET"])
      [ 200, {}, [] ]
    }
    ActionDispatch::RemoteIp.new(described_class.new(inner))
  end

  def call(headers = {})
    env = Rack::MockRequest.env_for("/public/organization", "REMOTE_ADDR" => "198.51.100.1")
    headers.each { |name, value| env["HTTP_#{name.upcase.tr('-', '_')}"] = value }
    app.call(env)
    seen
  end

  around { |example| with_env("WORKER_SECRET" => secret, "WORKER_SECRET_PREVIOUS" => nil) { example.run } }

  it "trusts the forwarded IP with a valid secret" do
    expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.7"))
      .to include(worker: true, client_ip: "203.0.113.7")
  end

  it "uses the connection IP without the secret" do
    expect(call("Flowfokus-Client-IP" => "203.0.113.7")).to include(worker: false, client_ip: "198.51.100.1")
  end

  it "uses the connection IP with a wrong secret" do
    expect(call("Flowfokus-Worker-Secret" => "x" * 40, "Flowfokus-Client-IP" => "203.0.113.7"))
      .to include(worker: false, client_ip: "198.51.100.1")
  end

  it "ignores a forwarded value that is not an IP address" do
    expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.7, 10.0.0.1"))
      .to include(worker: true, client_ip: "198.51.100.1")
    expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "10.0.0.0/8"))
      .to include(client_ip: "198.51.100.1")
  end

  it "accepts IPv6 addresses" do
    expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "2001:db8::7")).to include(client_ip: "2001:db8::7")
  end

  it "removes both headers before the app runs" do
    expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.7")).to include(forwarded: nil, secret: nil)
  end

  it "accepts the previous secret during rotation" do
    with_env("WORKER_SECRET" => "n" * 40, "WORKER_SECRET_PREVIOUS" => secret) do
      expect(call("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.7")).to include(worker: true)
    end
  end

  it "trusts nothing when no secret or a short secret is configured" do
    [ nil, "short" ].each do |value|
      with_env("WORKER_SECRET" => value) do
        expect(call("Flowfokus-Worker-Secret" => value.to_s, "Flowfokus-Client-IP" => "203.0.113.7"))
          .to include(worker: false, client_ip: "198.51.100.1")
      end
    end
  end
end
