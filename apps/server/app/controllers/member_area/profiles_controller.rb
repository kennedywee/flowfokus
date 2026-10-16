module MemberArea
  class ProfilesController < BaseController
    def show
      render_data Current.member.as_api
    end
  end
end
