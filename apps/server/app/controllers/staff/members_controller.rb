module Staff
  class MembersController < BaseController
    def index
      require_permission! "members:read"
      members = current_organization.members.newest_first.limit(200)
      members = members.matching(params[:q]) if params[:q].present?
      render_data members.map(&:as_api)
    end

    def show
      require_permission! "members:read"
      member = current_organization.members.includes(membership: :periods).find(params[:id])
      render_data member.as_detail_api
    end

    def create
      require_permission! "members:create"
      member = current_organization.members.create!(member_params)
      render_data member.as_api, status: :created
    end

    private
      def member_params = params.permit(:name, :email)
  end
end
