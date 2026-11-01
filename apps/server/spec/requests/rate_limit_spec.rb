require "rails_helper"

RSpec.describe "Public rate limit" do
  let(:secret) { "w" * 40 }

  before { chainsaw }

  around { |example| with_env("WORKER_SECRET" => secret) { example.run } }

  def get_public(headers = {})
    api :get, "/public/organization", token: nil, headers:
  end

  it "limits one client IP and names the reason" do
    300.times { get_public }
    expect(response).to have_http_status(:ok)

    get_public
    expect(response).to have_http_status(:too_many_requests)
    expect(error_code).to eq("rate_limited")
  end

  it "counts each Worker-proven browser IP separately" do
    300.times { get_public("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.7") }

    get_public("Flowfokus-Worker-Secret" => secret, "Flowfokus-Client-IP" => "203.0.113.8")
    expect(response).to have_http_status(:ok)
  end

  it "ignores a forged client IP without the secret" do
    300.times { |n| get_public("Flowfokus-Client-IP" => "203.0.113.#{n % 200}") }

    get_public("Flowfokus-Client-IP" => "198.51.100.200")
    expect(response).to have_http_status(:too_many_requests)
  end
end
