module Staff
  # A one-time code that lets a member link their sign-in to this record.
  class MemberLinksController < BaseController
    before_action { require_permission! "members:link" }

    def create
      member = current_organization.members.find(params[:member_id])
      link_code, code = MemberLinkCode.issue!(member:, actor: Current.user)
      render_data({ member_id: member.id, code:, expires_at: link_code.expires_at.utc.iso8601(3) }, status: :created)
    end

    def destroy
      member = current_organization.members.find(params[:member_id])
      member.unlink!
      render_data member.as_detail_api
    end
  end
end
