module MemberArea
  class AccountsController < BaseController
    def show
      render_data Current.member.as_account_api
    end
  end
end
