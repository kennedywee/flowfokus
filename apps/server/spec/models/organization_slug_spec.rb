require "rails_helper"

RSpec.describe Organization do
  it "reserves components, the portal's component gallery route" do
    organization = described_class.new(slug: "components", name: "Gym", currency: "MYR", timezone: "Asia/Kuala_Lumpur")
    organization.validate
    expect(organization.errors[:slug]).to include("is reserved")
  end
end
