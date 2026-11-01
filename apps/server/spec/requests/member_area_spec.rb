require "rails_helper"

RSpec.describe "Member area", workos: true, demo: false do
  let(:location) { create_location(chainsaw, name: "Bangsar") }
  let(:member) { create_member(chainsaw, name: "Mei Lim", email: "mei@example.com") }
  let(:person) { staff_user("user_mei", email: "mei.login@example.com") }
  let(:workos) { WorkosSyncHelpers::FakeWorkosApi.new }

  before do
    chainsaw && ironworks && demo_user
    allow(Flowfokus::WorkosApi).to receive(:from_env).and_return(workos)
  end

  # Members have no organization membership, so their tokens carry no org_id.
  def member_token(user = person) = workos_token(workos_claims(user:, organization: nil))

  def staff_code(for_member = member)
    MemberLinkCode.issue!(member: for_member, actor: demo_user).last
  end

  def link(code, token: member_token)
    api :post, "/member/link", token:, body: { code: }
  end

  it "links with a code from the desk, once" do
    code = staff_code

    api :get, "/member/account", token: member_token
    expect(response).to have_http_status(:forbidden)
    expect(error_code).to eq("member_not_linked")

    link(code.downcase.delete("-"))
    expect(response).to have_http_status(:created)
    expect(data).to include("name" => "Mei Lim", "email" => "mei@example.com")
    expect(member.reload.user).to eq(person)

    other = staff_user("user_other")
    link(code, token: member_token(other))
    expect(error_code).to eq("link_code_invalid")
  end

  it "refuses wrong, expired, and foreign codes the same way" do
    link("AAAA-BBBB-CCCC")
    expect(error_code).to eq("link_code_invalid")

    expired = staff_code
    travel 8.days do
      link(expired)
      expect(error_code).to eq("link_code_invalid")
    end

    foreign = staff_code(create_member(ironworks))
    link(foreign)
    expect(error_code).to eq("link_code_invalid")
    expect(member.reload.user).to be_nil
  end

  it "replaces an older code when staff issue a new one" do
    first = staff_code
    second = staff_code

    link(first)
    expect(error_code).to eq("link_code_invalid")
    link(second)
    expect(response).to have_http_status(:created)
  end

  it "never links one sign-in to two members of the same gym" do
    link(staff_code)
    link(staff_code(create_member(chainsaw)))

    expect(error_code).to eq("member_already_linked")
  end

  it "shows only the member's own records" do
    link(staff_code)
    sale = grant_access(chainsaw, member:, location:, amount_minor: 9_000)
    CheckIn.record!(organization: chainsaw, actor: demo_user, idempotency_key: SecureRandom.uuid, member_id: member.id, location_id: location.id)
    stranger = create_member(chainsaw)
    grant_access(chainsaw, member: stranger, location:)

    api :get, "/member/account", token: member_token

    expect(response).to have_http_status(:ok)
    expect(data["sales"].map { _1["id"] }).to eq([ sale.id ])
    expect(data["sales"].sole).to include("product_name" => sale.line_item.product_name, "balance_minor" => 0)
    expect(data["check_ins"].sole).to include("location_name" => "Bangsar", "result" => "granted")
    expect(data["entitlements"].size).to eq(1)
    expect(data["current_period"]).to be_present

    api :get, "/member/profile", token: member_token
    expect(data).to include("id" => member.id)
  end

  it "keeps a member of one gym out of another gym" do
    link(staff_code)

    api :get, "/member/account", organization: "ironworks", token: member_token
    expect(error_code).to eq("member_not_linked")
  end

  it "never gives a staff token member access, or a member token staff access" do
    staff_token = workos_token(workos_claims(user: person, organization: chainsaw, permissions: %w[members:read]))
    api :get, "/member/account", token: staff_token
    expect(error_code).to eq("member_not_linked")

    link(staff_code)
    api :get, "/staff/members", token: member_token
    expect(response).to have_http_status(:forbidden)
    expect(error_code).to eq("organization_mismatch")
  end

  it "imports a member's WorkOS user on first use" do
    workos.users["user_new_member"] = workos_user_data("user_new_member", email: "new@example.com")
    claims = workos_claims(user: User.new(workos_id: "user_new_member"), organization: nil)

    api :get, "/member/account", token: workos_token(claims)

    expect(error_code).to eq("member_not_linked")
    expect(User.find_by!(workos_id: "user_new_member").email).to eq("new@example.com")
  end

  it "refuses the demo token" do
    api :get, "/member/account", token: EnvHelpers::DEMO_TOKEN
    expect(response).to have_http_status(:unauthorized).or have_http_status(:forbidden)
  end

  describe "staff link codes", workos: false, demo: true do
    it "issues a readable one-time code and unlinks" do
      api :post, "/staff/members/#{member.id}/link"
      expect(response).to have_http_status(:created)
      expect(data["code"]).to match(/\A[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}\z/)
      expect(MemberLinkCode.last.code_digest).not_to include(data["code"].delete("-"))

      member.update!(user: person)
      api :post, "/staff/members/#{member.id}/link"
      expect(error_code).to eq("member_already_linked")

      api :get, "/staff/members/#{member.id}"
      expect(data["linked_email"]).to eq("mei.login@example.com")

      api :delete, "/staff/members/#{member.id}/link"
      expect(response).to have_http_status(:ok)
      expect(data["linked_email"]).to be_nil
    end

    it "keeps another organization's members out of reach" do
      api :post, "/staff/members/#{create_member(ironworks).id}/link"
      expect(response).to have_http_status(:not_found)
    end
  end
end
