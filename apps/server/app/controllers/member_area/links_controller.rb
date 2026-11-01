module MemberArea
  # POST /member/link: the signed-in person enters the code from the front desk.
  class LinksController < BaseController
    skip_before_action :authenticate_member!
    before_action :authenticate_user!
    limit_requests to: 10, within: 10.minutes

    def create
      member = MemberLinkCode.redeem!(organization: Current.organization, user: Current.user, code: params.require(:code))
      render_data member.as_account_api, status: :created
    end
  end
end
