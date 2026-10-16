require "rails_helper"

RSpec.describe "Health checks" do
  it "reports liveness without touching the database" do
    allow(ActiveRecord::Base).to receive(:connection_pool).and_raise(ActiveRecord::ConnectionNotEstablished)

    api :get, "/up", organization: nil, token: nil

    expect(response).to have_http_status(:ok)
    expect(data).to eq("status" => "ok")
  end

  it "reports readiness after a database query" do
    api :get, "/ready", organization: nil, token: nil

    expect(response).to have_http_status(:ok)
  end

  it "reports 503 when the database is down" do
    allow(ActiveRecord::Base.connection_pool).to receive(:with_connection).and_raise(ActiveRecord::ConnectionNotEstablished)

    api :get, "/ready", organization: nil, token: nil

    expect(response).to have_http_status(:service_unavailable)
    expect(error_code).to eq("database_unavailable")
  end
end
