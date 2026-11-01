module Staff
  class ReportsController < BaseController
    def show
      require_permission! "purchases:read"
      require_permission! "check_ins:read"
      render_data Organization::Report.new(current_organization, weeks: params[:weeks]).as_api
    end
  end
end
